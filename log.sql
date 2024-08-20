PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE "request_log" (
"serial" integer NOT NULL primary key autoincrement,
"email" varchar(30) DEFAULT NULL,
"log_time" datetime DEFAULT NULL,
"user" mediumblob,
"assist"  mediumblob);
COMMIT;
