-- Migration script to create Video table and update Stream table
-- Run this script to add video management functionality

-- Create videos table
CREATE TABLE IF NOT EXISTS `videos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `file_name` varchar(255) NOT NULL,
  `file_path` text NOT NULL,
  `file_size` bigint(20) DEFAULT NULL,
  `duration` int(11) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `upload_type` enum('local','google_drive') DEFAULT 'local',
  `google_drive_file_id` varchar(255) DEFAULT NULL,
  `google_drive_link` text,
  `thumbnail_path` text,
  `status` enum('uploading','processing','ready','error') DEFAULT 'uploading',
  `error_message` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `status` (`status`),
  KEY `upload_type` (`upload_type`),
  CONSTRAINT `videos_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add video_id column to streams table if it doesn't exist
ALTER TABLE `streams` 
ADD COLUMN `video_id` int(11) DEFAULT NULL AFTER `source_url`,
ADD KEY `video_id` (`video_id`),
ADD CONSTRAINT `streams_ibfk_2` FOREIGN KEY (`video_id`) REFERENCES `videos` (`id`) ON DELETE SET NULL;
