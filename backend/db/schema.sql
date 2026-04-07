CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  login VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  type TINYINT NOT NULL,
  active TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  maxpax INT NOT NULL DEFAULT 0,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  icon VARCHAR(255) NULL,
  color VARCHAR(7) NULL,
  template_html MEDIUMTEXT NULL,
  active TINYINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS user_services (
  user_id INT NOT NULL,
  service_id INT NOT NULL,
  PRIMARY KEY (user_id, service_id),
  CONSTRAINT fk_user_services_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_services_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  service_id INT NOT NULL,
  hours DECIMAL(4,2) NOT NULL DEFAULT 0,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  type TINYINT NOT NULL,
  booking_color VARCHAR(7) NULL,
  active TINYINT NOT NULL DEFAULT 1,
  CONSTRAINT fk_products_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tel VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  comments TEXT NULL,
  ref VARCHAR(32) NULL,
  group_flag TINYINT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS commissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  commission INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_commissions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_commissions_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_commission_user_product (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  service_id INT NOT NULL,
  avans DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_start DATE NOT NULL,
  start_time TIME NOT NULL,
  product_id INT NOT NULL,
  pax INT NOT NULL DEFAULT 1,
  comments TEXT NULL,
  manager_id INT NOT NULL,
  status TINYINT NOT NULL DEFAULT 1,
  closed_by INT NULL,
  soldprice DECIMAL(10,2) NULL,
  soldprice_type TINYINT NULL,
  canal TINYINT NULL,
  instructor VARCHAR(128) NULL,
  CONSTRAINT fk_bookings_customer FOREIGN KEY (client_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_closed_by FOREIGN KEY (closed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS booking_reads (
  booking_id INT NOT NULL,
  user_id INT NOT NULL,
  read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (booking_id, user_id),
  CONSTRAINT fk_booking_reads_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_reads_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS blocked_time (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_id INT NOT NULL,
  start DATETIME NOT NULL,
  blocked_hours DECIMAL(4,2) NOT NULL,
  comments TEXT NULL,
  CONSTRAINT fk_blocked_time_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

CREATE INDEX idx_bookings_date_start ON bookings(date_start);
CREATE INDEX idx_bookings_service ON bookings(service_id);
CREATE INDEX idx_bookings_manager ON bookings(manager_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_product ON bookings(product_id);
