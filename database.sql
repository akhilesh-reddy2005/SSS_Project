CREATE DATABASE IF NOT EXISTS `expense_tracker`;
USE `expense_tracker`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `firebase_uid` VARCHAR(128) UNIQUE DEFAULT NULL,
  `password` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SET @firebase_uid_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'firebase_uid'
);

SET @firebase_uid_alter_sql = IF(
  @firebase_uid_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `firebase_uid` VARCHAR(128) UNIQUE DEFAULT NULL',
  'SELECT 1'
);

PREPARE firebase_uid_stmt FROM @firebase_uid_alter_sql;
EXECUTE firebase_uid_stmt;
DEALLOCATE PREPARE firebase_uid_stmt;

CREATE TABLE IF NOT EXISTS `expenses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `category` ENUM('Food', 'Travel', 'Bills', 'Shopping', 'Others') NOT NULL,
  `expense_date` DATE NOT NULL,
  `description` VARCHAR(255),
  `receipt_path` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

SET @receipt_col_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'expenses'
    AND COLUMN_NAME = 'receipt_path'
);

SET @receipt_col_alter_sql = IF(
  @receipt_col_exists = 0,
  'ALTER TABLE `expenses` ADD COLUMN `receipt_path` VARCHAR(255) DEFAULT NULL',
  'SELECT 1'
);

PREPARE receipt_col_stmt FROM @receipt_col_alter_sql;
EXECUTE receipt_col_stmt;
DEALLOCATE PREPARE receipt_col_stmt;

CREATE TABLE IF NOT EXISTS `budgets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `budget_month` CHAR(7) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_user_month` (`user_id`, `budget_month`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- Insert sample demo user (Password is 'Demo@1234')
-- user_id = 1
INSERT INTO `users` (`name`, `email`, `password`) VALUES 
('Demo User', 'demo@example.com', '$2y$10$F4hgtcn6mAlwByn7VZLCMud5yVDlzPChuwO28bcNE6YPs44XNZ.uK');

-- Insert sample expenses for the demo user
INSERT INTO `expenses` (`user_id`, `amount`, `category`, `expense_date`, `description`) VALUES 
(1, 15.50, 'Food', CURDATE(), 'Lunch at cafe'),
(1, 45.00, 'Travel', CURDATE() - INTERVAL 1 DAY, 'Uber to office'),
(1, 120.00, 'Bills', CURDATE() - INTERVAL 5 DAY, 'Electricity bill'),
(1, 200.00, 'Shopping', CURDATE() - INTERVAL 10 DAY, 'New shoes'),
(1, 35.00, 'Food', CURDATE() - INTERVAL 2 DAY, 'Groceries'),
(1, 10.00, 'Others', CURDATE() - INTERVAL 3 DAY, 'Movie ticket'),
(1, 5.00, 'Food', CURDATE() - INTERVAL 12 DAY, 'Coffee');
