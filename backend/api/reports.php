<?php
session_start();
require_once __DIR__ . '/../config/db.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized.']);
    exit;
}

$user_id = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

function ensure_budgets_table($pdo) {
    static $checked = false;

    if ($checked) {
        return;
    }

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS budgets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            budget_month CHAR(7) NOT NULL,
            amount DECIMAL(12,2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_user_month (user_id, budget_month),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );

    $checked = true;
}

if ($method === 'GET') {
    $month = isset($_GET['month']) ? $_GET['month'] : date('Y-m'); // Format: YYYY-MM
    ensure_budgets_table($pdo);
    
    // Fetch total monthly spending
    $stmt = $pdo->prepare('SELECT SUM(amount) as total FROM expenses WHERE user_id = ? AND DATE_FORMAT(expense_date, "%Y-%m") = ?');
    $stmt->execute([$user_id, $month]);
    $total_result = $stmt->fetch();
    $total_monthly = $total_result['total'] ? (float)$total_result['total'] : 0;

    // Category breakdown
    $stmt = $pdo->prepare('SELECT category, SUM(amount) as total_amount FROM expenses WHERE user_id = ? AND DATE_FORMAT(expense_date, "%Y-%m") = ? GROUP BY category');
    $stmt->execute([$user_id, $month]);
    $category_breakdown = $stmt->fetchAll();

    // Monthly totals (last 6 months including current month)
    $stmt = $pdo->prepare(
        'SELECT DATE_FORMAT(expense_date, "%Y-%m") as month_key, SUM(amount) as total_amount
         FROM expenses
         WHERE user_id = ? AND expense_date >= DATE_SUB(DATE_FORMAT(CONCAT(?, "-01"), "%Y-%m-01"), INTERVAL 5 MONTH)
         AND expense_date < DATE_ADD(DATE_FORMAT(CONCAT(?, "-01"), "%Y-%m-01"), INTERVAL 1 MONTH)
         GROUP BY DATE_FORMAT(expense_date, "%Y-%m")
         ORDER BY month_key ASC'
    );
    $stmt->execute([$user_id, $month, $month]);
    $monthly_series = $stmt->fetchAll();

    // Daily spending trend for current month
    $stmt = $pdo->prepare(
        'SELECT DATE(expense_date) as day_key, SUM(amount) as total_amount
         FROM expenses
         WHERE user_id = ? AND DATE_FORMAT(expense_date, "%Y-%m") = ?
         GROUP BY DATE(expense_date)
         ORDER BY day_key ASC'
    );
    $stmt->execute([$user_id, $month]);
    $daily_series = $stmt->fetchAll();

    // Monthly budget
    $stmt = $pdo->prepare('SELECT amount FROM budgets WHERE user_id = ? AND budget_month = ? LIMIT 1');
    $stmt->execute([$user_id, $month]);
    $budget_row = $stmt->fetch();
    $budget_amount = $budget_row ? (float)$budget_row['amount'] : 0;
    $remaining_balance = $budget_amount - $total_monthly;
    $percentage_used = $budget_amount > 0 ? min(100, ($total_monthly / $budget_amount) * 100) : 0;
    $budget_exceeded = $budget_amount > 0 && $total_monthly > $budget_amount;

    // AI Insights (Rule-Based)
    $insights = [];
    $food_total = 0;
    
    foreach ($category_breakdown as $cat) {
        if ($cat['category'] === 'Food') {
            $food_total = (float)$cat['total_amount'];
        }
    }

    if ($total_monthly > 0) {
        // If food expenses > 30% of total -> show warning
        if (($food_total / $total_monthly) > 0.3) {
            $insights[] = [
                'type' => 'warning',
                'message' => 'Your food expenses are more than 30% of your monthly spending. You can save more by cooking at home more often.'
            ];
        }

        // If total monthly expense > threshold (in INR) -> show suggestion
        $threshold = 30000;
        if ($total_monthly > $threshold) {
             $insights[] = [
                'type' => 'suggestion',
                'message' => 'Your monthly spending is high (above INR ' . $threshold . '). Review non-essential expenses to cut costs.'
             ];
        }

        // If no savings (Assume high expense > 50000 INR means low savings)
        $income_assumption = 50000;
        if ($total_monthly >= $income_assumption) {
            $insights[] = [
                'type' => 'advice',
                'message' => 'Your expenses are close to or above a typical monthly income level. Try a strict monthly budget to increase savings.'
            ];
        } else {
             $insights[] = [
                'type' => 'success',
                'message' => 'Great job keeping your spending in control. Consider moving the remaining balance into savings.'
            ];
        }
    } else {
        $insights[] = [
            'type' => 'info',
            'message' => 'No expenses recorded for this month yet. Start by adding your first expense.'
        ];
    }
    
    // Recent transactions (last 5)
    $stmt = $pdo->prepare('SELECT * FROM expenses WHERE user_id = ? ORDER BY expense_date DESC, id DESC LIMIT 5');
    $stmt->execute([$user_id]);
    $recent_transactions = $stmt->fetchAll();

    echo json_encode([
        'status' => 'success',
        'data' => [
            'total_monthly' => $total_monthly,
            'category_breakdown' => $category_breakdown,
            'monthly_series' => $monthly_series,
            'daily_series' => $daily_series,
            'insights' => $insights,
            'recent_transactions' => $recent_transactions,
            'month' => $month,
            'budget' => [
                'amount' => $budget_amount,
                'remaining' => $remaining_balance,
                'percentage_used' => $percentage_used,
                'exceeded' => $budget_exceeded
            ]
        ]
    ]);
} elseif ($method === 'POST') {
    $action = isset($_GET['action']) ? $_GET['action'] : '';
    $data = json_decode(file_get_contents('php://input'), true);

    if ($action === 'set_budget') {
        ensure_budgets_table($pdo);

        $month = trim($data['month'] ?? date('Y-m'));
        $amount = isset($data['amount']) ? (float)$data['amount'] : 0;

        if ($amount <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'Budget amount must be greater than zero.']);
            exit;
        }

        $stmt = $pdo->prepare(
            'INSERT INTO budgets (user_id, budget_month, amount)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE amount = VALUES(amount), updated_at = CURRENT_TIMESTAMP'
        );
        $stmt->execute([$user_id, $month, $amount]);

        echo json_encode(['status' => 'success', 'message' => 'Budget saved successfully.']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Invalid action.']);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid method.']);
}
?>
