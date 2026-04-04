
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `tsoinyane_school_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `tsoinyane_school_db`;
DROP TABLE IF EXISTS `activity_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activity_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `action` varchar(255) NOT NULL,
  `actor_email` varchar(255) DEFAULT NULL,
  `actor_id` bigint DEFAULT NULL,
  `actor_name` varchar(255) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `description` varchar(1000) NOT NULL,
  `endpoint` varchar(255) NOT NULL,
  `http_method` varchar(255) NOT NULL,
  `ip_address` varchar(255) DEFAULT NULL,
  `module` varchar(255) NOT NULL,
  `school_id` bigint DEFAULT NULL,
  `school_name` varchar(255) DEFAULT NULL,
  `status_code` int NOT NULL,
  `success` bit(1) NOT NULL,
  `target_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=101 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `assessment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assessment` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `assessment_date` datetime(6) DEFAULT NULL,
  `description` varchar(1500) DEFAULT NULL,
  `pass_mark` double DEFAULT NULL,
  `status` enum('CLOSED','DRAFT','PUBLISHED') NOT NULL,
  `title` varchar(150) NOT NULL,
  `total_marks` double NOT NULL,
  `type` enum('ASSIGNMENT','EXAM','PROJECT','QUIZ','TEST') NOT NULL,
  `created_by_id` bigint DEFAULT NULL,
  `updated_by_id` bigint DEFAULT NULL,
  `subject_assignment_id` bigint NOT NULL,
  `teacher_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK32uk87oaw509rm2otfch1gh5f` (`created_by_id`),
  KEY `FKbhrhpx9vweipgl8ehc500eofg` (`updated_by_id`),
  KEY `FKkyqcd9dbgg4ylrikwcmu8eblc` (`subject_assignment_id`),
  KEY `FKn2dwrmp61jdvttrow2c4y3th4` (`teacher_id`),
  CONSTRAINT `FK32uk87oaw509rm2otfch1gh5f` FOREIGN KEY (`created_by_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FKbhrhpx9vweipgl8ehc500eofg` FOREIGN KEY (`updated_by_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FKkyqcd9dbgg4ylrikwcmu8eblc` FOREIGN KEY (`subject_assignment_id`) REFERENCES `subject_assignment` (`id`),
  CONSTRAINT `FKn2dwrmp61jdvttrow2c4y3th4` FOREIGN KEY (`teacher_id`) REFERENCES `teacher` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `assessment_mark`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assessment_mark` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `comment` varchar(1000) DEFAULT NULL,
  `score` double DEFAULT NULL,
  `created_by_id` bigint DEFAULT NULL,
  `updated_by_id` bigint DEFAULT NULL,
  `assessment_id` bigint NOT NULL,
  `student_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKla1c1r48vd14lifutoekk9v3m` (`created_by_id`),
  KEY `FKjqykdxc8yqna6vc04rb2fmib2` (`updated_by_id`),
  KEY `FK4u8891f52qjcsh8pmf2vu71g2` (`assessment_id`),
  KEY `FKpdl7drqyiqys8f3e8g44ersds` (`student_id`),
  CONSTRAINT `FK4u8891f52qjcsh8pmf2vu71g2` FOREIGN KEY (`assessment_id`) REFERENCES `assessment` (`id`),
  CONSTRAINT `FKjqykdxc8yqna6vc04rb2fmib2` FOREIGN KEY (`updated_by_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FKla1c1r48vd14lifutoekk9v3m` FOREIGN KEY (`created_by_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FKpdl7drqyiqys8f3e8g44ersds` FOREIGN KEY (`student_id`) REFERENCES `student` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `fee_payment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fee_payment` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `amount` double NOT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `payment_date` date NOT NULL,
  `payment_method` enum('BANK','CASH','ECO_CASH','MPESA') NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `reversal_reason` varchar(500) DEFAULT NULL,
  `reversed` bit(1) NOT NULL,
  `reversed_at` datetime(6) DEFAULT NULL,
  `created_by_id` bigint DEFAULT NULL,
  `updated_by_id` bigint DEFAULT NULL,
  `fee_structure_id` bigint NOT NULL,
  `reversed_by_id` bigint DEFAULT NULL,
  `student_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK7510iicsvupaoebhj7s1pk4l7` (`created_by_id`),
  KEY `FK40ve382c3raqkt5u0bn486c6s` (`updated_by_id`),
  KEY `FKo9jk7qry45oguq3osc4kfbsh0` (`fee_structure_id`),
  KEY `FKmpxtbatnekwhkhf27pk9xhpr` (`reversed_by_id`),
  KEY `FK5io3l08ls0isn9ygrrkiweggd` (`student_id`),
  CONSTRAINT `FK40ve382c3raqkt5u0bn486c6s` FOREIGN KEY (`updated_by_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FK5io3l08ls0isn9ygrrkiweggd` FOREIGN KEY (`student_id`) REFERENCES `student` (`id`),
  CONSTRAINT `FK7510iicsvupaoebhj7s1pk4l7` FOREIGN KEY (`created_by_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FKmpxtbatnekwhkhf27pk9xhpr` FOREIGN KEY (`reversed_by_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FKo9jk7qry45oguq3osc4kfbsh0` FOREIGN KEY (`fee_structure_id`) REFERENCES `fee_structure` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `fee_structure`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fee_structure` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `academic_year` varchar(10) NOT NULL,
  `amount` double NOT NULL,
  `exam_fee` double NOT NULL,
  `registration_fee` double NOT NULL,
  `school_fee` double NOT NULL,
  `term` enum('TERM_1','TERM_2','TERM_3','TERM_4') NOT NULL,
  `created_by_id` bigint DEFAULT NULL,
  `updated_by_id` bigint DEFAULT NULL,
  `grade_id` bigint NOT NULL,
  `school_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK1hwlvtu3jd1kd6akqo2r2iljd` (`school_id`,`grade_id`,`term`,`academic_year`),
  KEY `FKb11ri9geoh5cpo9gcp55pnroq` (`created_by_id`),
  KEY `FKjhaow06yk8kkgmddi6p568fwc` (`updated_by_id`),
  KEY `FKl9rs7vx20vnbnu5s5vltamni0` (`grade_id`),
  CONSTRAINT `FKb11ri9geoh5cpo9gcp55pnroq` FOREIGN KEY (`created_by_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FKb5ugldxmbr0gfw6eg9hrovv9i` FOREIGN KEY (`school_id`) REFERENCES `school` (`id`),
  CONSTRAINT `FKjhaow06yk8kkgmddi6p568fwc` FOREIGN KEY (`updated_by_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FKl9rs7vx20vnbnu5s5vltamni0` FOREIGN KEY (`grade_id`) REFERENCES `grade` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `fee_term_window`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fee_term_window` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `academic_year` varchar(10) NOT NULL,
  `closing_date` date DEFAULT NULL,
  `opening_date` date DEFAULT NULL,
  `term` enum('TERM_1','TERM_2','TERM_3','TERM_4') NOT NULL,
  `created_by_id` bigint DEFAULT NULL,
  `updated_by_id` bigint DEFAULT NULL,
  `school_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKsb7sfig7y0uc4jytd4gq8jsdr` (`school_id`,`term`,`academic_year`),
  KEY `FKbfh1pai66298hl4532xu8n4b3` (`created_by_id`),
  KEY `FK9h6brb5df8v873eevyy7n7jvi` (`updated_by_id`),
  CONSTRAINT `FK9h6brb5df8v873eevyy7n7jvi` FOREIGN KEY (`updated_by_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FKbfh1pai66298hl4532xu8n4b3` FOREIGN KEY (`created_by_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FKoydjk28kham3rt9tl92if4c7s` FOREIGN KEY (`school_id`) REFERENCES `school` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `grade`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `grade` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_by_id` bigint DEFAULT NULL,
  `updated_by_id` bigint DEFAULT NULL,
  `school_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKnfgdwiuxgaflkg654re7n3ykm` (`created_by_id`),
  KEY `FK6fg9powbr3f5ysn2860vfel76` (`updated_by_id`),
  KEY `FKmofvtgl3d0w6b7mclu88gxvt0` (`school_id`),
  CONSTRAINT `FK6fg9powbr3f5ysn2860vfel76` FOREIGN KEY (`updated_by_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FKmofvtgl3d0w6b7mclu88gxvt0` FOREIGN KEY (`school_id`) REFERENCES `school` (`id`),
  CONSTRAINT `FKnfgdwiuxgaflkg654re7n3ykm` FOREIGN KEY (`created_by_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `installment_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `installment_plans` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `status` enum('ACTIVE','CANCELLED','COMPLETED') NOT NULL,
  `total_amount` double NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `fee_structure_id` bigint NOT NULL,
  `student_id` bigint NOT NULL,
  `updated_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKc6983n5vdj2w0ftd7cu4p5u74` (`created_by`),
  KEY `FKon5a0cjq7s5566ose19qu9x7f` (`fee_structure_id`),
  KEY `FKokgkvwuq17vqhrdirn6qc8q2d` (`student_id`),
  KEY `FK64ikwo6vbo4o5w1833055ec5y` (`updated_by`),
  CONSTRAINT `FK64ikwo6vbo4o5w1833055ec5y` FOREIGN KEY (`updated_by`) REFERENCES `user` (`id`),
  CONSTRAINT `FKc6983n5vdj2w0ftd7cu4p5u74` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`),
  CONSTRAINT `FKokgkvwuq17vqhrdirn6qc8q2d` FOREIGN KEY (`student_id`) REFERENCES `student` (`id`),
  CONSTRAINT `FKon5a0cjq7s5566ose19qu9x7f` FOREIGN KEY (`fee_structure_id`) REFERENCES `fee_structure` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `installment_schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `installment_schedules` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `amount` double NOT NULL,
  `due_date` date NOT NULL,
  `installment_number` int NOT NULL,
  `paid_amount` double NOT NULL,
  `paid_date` date DEFAULT NULL,
  `status` enum('OVERDUE','PAID','PENDING') NOT NULL,
  `installment_plan_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK9hj1fs8k78us7tdphojytd2g6` (`installment_plan_id`),
  CONSTRAINT `FK9hj1fs8k78us7tdphojytd2g6` FOREIGN KEY (`installment_plan_id`) REFERENCES `installment_plans` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `lesson`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lesson` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `cancellation_reason` varchar(255) DEFAULT NULL,
  `date` datetime(6) DEFAULT NULL,
  `end_time` datetime(6) DEFAULT NULL,
  `start_time` datetime(6) DEFAULT NULL,
  `status` enum('CANCELLED','PENDING','SUBMITTED') DEFAULT NULL,
  `submitted` bit(1) NOT NULL,
  `created_by_id` bigint DEFAULT NULL,
  `updated_by_id` bigint DEFAULT NULL,
  `subject_assignment_id` bigint DEFAULT NULL,
  `teacher_id` bigint DEFAULT NULL,
  `timetable_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKb2dj9eqr9lmb9ueyswsy3mfyc` (`created_by_id`),
  KEY `FKj502pu2bjriukqrawofsgwnym` (`updated_by_id`),
  KEY `FKpiv666sskop8x98jon2mdpjkl` (`subject_assignment_id`),
  KEY `FK9yhaoqrjxt5gwmn6icp1lf35n` (`teacher_id`),
  KEY `FKjkvglb9r59bldihak12ua4f3w` (`timetable_id`),
  CONSTRAINT `FK9yhaoqrjxt5gwmn6icp1lf35n` FOREIGN KEY (`teacher_id`) REFERENCES `teacher` (`id`),
  CONSTRAINT `FKb2dj9eqr9lmb9ueyswsy3mfyc` FOREIGN KEY (`created_by_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FKj502pu2bjriukqrawofsgwnym` FOREIGN KEY (`updated_by_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FKjkvglb9r59bldihak12ua4f3w` FOREIGN KEY (`timetable_id`) REFERENCES `timetable` (`id`),
  CONSTRAINT `FKpiv666sskop8x98jon2mdpjkl` FOREIGN KEY (`subject_assignment_id`) REFERENCES `subject_assignment` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `notification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `expires_at` datetime(6) DEFAULT NULL,
  `icon` varchar(50) NOT NULL,
  `message` varchar(1000) NOT NULL,
  `scheduled_at` datetime(6) DEFAULT NULL,
  `school_id` bigint DEFAULT NULL,
  `school_name` varchar(255) DEFAULT NULL,
  `title` varchar(150) NOT NULL,
  `type` varchar(50) NOT NULL,
  `created_by_id` bigint DEFAULT NULL,
  `updated_by_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKknr9pm3d2o99w4ieqp8q8pi5i` (`created_by_id`),
  KEY `FK8q62hgk94ur2fga4sct1a807g` (`updated_by_id`),
  CONSTRAINT `FK8q62hgk94ur2fga4sct1a807g` FOREIGN KEY (`updated_by_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FKknr9pm3d2o99w4ieqp8q8pi5i` FOREIGN KEY (`created_by_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `notification_audience_role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_audience_role` (
  `notification_id` bigint NOT NULL,
  `audience_role` enum('SCHOOL_ADMIN','STUDENT','SYSTEM_ADMIN','TEACHER') NOT NULL,
  PRIMARY KEY (`notification_id`,`audience_role`),
  CONSTRAINT `FKrha6ng7nd1jxsokku8wnqfv4l` FOREIGN KEY (`notification_id`) REFERENCES `notification` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `notification_read_by`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_read_by` (
  `notification_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`notification_id`,`user_id`),
  CONSTRAINT `FK22as2o4qw6o4gbinccdmllfsy` FOREIGN KEY (`notification_id`) REFERENCES `notification` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `school`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `school` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `academic_year` varchar(10) DEFAULT NULL,
  `attendance_threshold` int DEFAULT NULL,
  `code` varchar(255) DEFAULT NULL,
  `current_term` enum('TERM_1','TERM_2','TERM_3','TERM_4') DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `language` varchar(20) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `passing_mark` int DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `type` enum('HIGH','PRIMARY') DEFAULT NULL,
  `created_by_id` bigint DEFAULT NULL,
  `updated_by_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKs4h4dmiyw5tedpchd7cg5hlbn` (`created_by_id`),
  KEY `FKfb6wy3wg96y9h553cmfok6io7` (`updated_by_id`),
  CONSTRAINT `FKfb6wy3wg96y9h553cmfok6io7` FOREIGN KEY (`updated_by_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FKs4h4dmiyw5tedpchd7cg5hlbn` FOREIGN KEY (`created_by_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `school_event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `school_event` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `date` date NOT NULL,
  `description` varchar(1000) DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `event_type` varchar(255) DEFAULT NULL,
  `location` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `start_time` time DEFAULT NULL,
  `status` varchar(255) NOT NULL,
  `created_by_id` bigint DEFAULT NULL,
  `updated_by_id` bigint DEFAULT NULL,
  `school_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKs5mx9sajw5wi8o2g9hbw4jv0j` (`created_by_id`),
  KEY `FK2ntp87qka95qfrvm3g4w65kb3` (`updated_by_id`),
  KEY `FK5ox8m2de05a8y360mio77n40l` (`school_id`),
  CONSTRAINT `FK2ntp87qka95qfrvm3g4w65kb3` FOREIGN KEY (`updated_by_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FK5ox8m2de05a8y360mio77n40l` FOREIGN KEY (`school_id`) REFERENCES `school` (`id`),
  CONSTRAINT `FKs5mx9sajw5wi8o2g9hbw4jv0j` FOREIGN KEY (`created_by_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `student`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `student_number` varchar(255) NOT NULL,
  `created_by_id` bigint DEFAULT NULL,
  `updated_by_id` bigint DEFAULT NULL,
  `grade_id` bigint DEFAULT NULL,
  `school_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK17gskajnuiawdedks0b3lp8rx` (`student_number`),
  UNIQUE KEY `UKbkix9btnoi1n917ll7bplkvg5` (`user_id`),
  KEY `FKh4nnv39m439xlp3p5fuv3pqww` (`created_by_id`),
  KEY `FKpxg20qpwwd3gf9fq3kgdd4x0t` (`updated_by_id`),
  KEY `FK4xvaqcll34afqdd9vkydid5qo` (`grade_id`),
  KEY `FK1vm0oqhk9viil6eocn49rj1l9` (`school_id`),
  CONSTRAINT `FK1vm0oqhk9viil6eocn49rj1l9` FOREIGN KEY (`school_id`) REFERENCES `school` (`id`),
  CONSTRAINT `FK4xvaqcll34afqdd9vkydid5qo` FOREIGN KEY (`grade_id`) REFERENCES `grade` (`id`),
  CONSTRAINT `FKh4nnv39m439xlp3p5fuv3pqww` FOREIGN KEY (`created_by_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FKk5m148xqefonqw7bgnpm0snwj` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FKpxg20qpwwd3gf9fq3kgdd4x0t` FOREIGN KEY (`updated_by_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `student_lesson`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_lesson` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `absence_comment` varchar(500) DEFAULT NULL,
  `absence_reason` enum('EXCUSED','MEDICAL','OTHER','UNEXCUSED') DEFAULT NULL,
  `attendance_status` enum('ABSENT','LATE','PENDING','PRESENT') DEFAULT NULL,
  `comment` varchar(500) DEFAULT NULL,
  `homework_status` enum('DONE','NONE','NOT_DONE','PENDING') DEFAULT NULL,
  `created_by_id` bigint DEFAULT NULL,
  `updated_by_id` bigint DEFAULT NULL,
  `lesson_id` bigint NOT NULL,
  `student_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKia34yhvus9jb37l0qforf9r9x` (`created_by_id`),
  KEY `FK6gu91eucgvqrpl7xlc4tbh4qg` (`updated_by_id`),
  KEY `FKa64mwri6gq3ai7jwih91gsmf7` (`lesson_id`),
  KEY `FK2nmxs05vgk43xy1cko182p72p` (`student_id`),
  CONSTRAINT `FK2nmxs05vgk43xy1cko182p72p` FOREIGN KEY (`student_id`) REFERENCES `student` (`id`),
  CONSTRAINT `FK6gu91eucgvqrpl7xlc4tbh4qg` FOREIGN KEY (`updated_by_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FKa64mwri6gq3ai7jwih91gsmf7` FOREIGN KEY (`lesson_id`) REFERENCES `lesson` (`id`),
  CONSTRAINT `FKia34yhvus9jb37l0qforf9r9x` FOREIGN KEY (`created_by_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `subject`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subject` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `code` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `status` enum('ACTIVE','DELETED','INACTIVE','PENDING') NOT NULL,
  `created_by_id` bigint DEFAULT NULL,
  `updated_by_id` bigint DEFAULT NULL,
  `school_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKosq1frj5n3c1kjxoc5qry0exx` (`school_id`,`code`),
  KEY `FKj426cuk44bpyu2kk7llskl6n5` (`created_by_id`),
  KEY `FK5rf3xveyyebcjhtloqvvnc8f6` (`updated_by_id`),
  CONSTRAINT `FK5rf3xveyyebcjhtloqvvnc8f6` FOREIGN KEY (`updated_by_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FKg9ahxfklvfv5o2d8ejweibfo8` FOREIGN KEY (`school_id`) REFERENCES `school` (`id`),
  CONSTRAINT `FKj426cuk44bpyu2kk7llskl6n5` FOREIGN KEY (`created_by_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `subject_assignment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subject_assignment` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `status` enum('ACTIVE','DELETED','INACTIVE','PENDING') NOT NULL,
  `created_by_id` bigint DEFAULT NULL,
  `updated_by_id` bigint DEFAULT NULL,
  `grade_id` bigint NOT NULL,
  `subject_id` bigint NOT NULL,
  `teacher_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKt6ojmak2ma6828dq7lgtuts7i` (`subject_id`,`grade_id`),
  KEY `FKma8cl4vgm8b4hmw3i61jbrcfi` (`created_by_id`),
  KEY `FKr54kjk68ydg4s4afv4xahqjht` (`updated_by_id`),
  KEY `FKtbounf5k7pen6wx85234fl9dp` (`grade_id`),
  KEY `FKjvousvwbu0p39th35dryscg44` (`teacher_id`),
  CONSTRAINT `FKjvousvwbu0p39th35dryscg44` FOREIGN KEY (`teacher_id`) REFERENCES `teacher` (`id`),
  CONSTRAINT `FKma8cl4vgm8b4hmw3i61jbrcfi` FOREIGN KEY (`created_by_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FKn0mlxu4i5jxttfqsjou5ava5s` FOREIGN KEY (`subject_id`) REFERENCES `subject` (`id`),
  CONSTRAINT `FKr54kjk68ydg4s4afv4xahqjht` FOREIGN KEY (`updated_by_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FKtbounf5k7pen6wx85234fl9dp` FOREIGN KEY (`grade_id`) REFERENCES `grade` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `subject_student`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subject_student` (
  `subject_assignment_id` bigint NOT NULL,
  `student_id` bigint NOT NULL,
  PRIMARY KEY (`subject_assignment_id`,`student_id`),
  KEY `FKmssy4ihn2qacb6xjjybsykqq5` (`student_id`),
  CONSTRAINT `FKenj4e1e3oeu58yx7okv9hffye` FOREIGN KEY (`subject_assignment_id`) REFERENCES `subject_assignment` (`id`),
  CONSTRAINT `FKmssy4ihn2qacb6xjjybsykqq5` FOREIGN KEY (`student_id`) REFERENCES `student` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `teacher`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teacher` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `created_by_id` bigint DEFAULT NULL,
  `updated_by_id` bigint DEFAULT NULL,
  `school_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKi5wqs2ds2vpmfpbcdxi9m2jvr` (`user_id`),
  KEY `FK8tadhpxkidr2hpguah28m2p1d` (`created_by_id`),
  KEY `FKb4crtjlq4xvkamnji49ccl1rq` (`updated_by_id`),
  KEY `FKrg46bnmgbcccayv14naymqg3r` (`school_id`),
  CONSTRAINT `FK8tadhpxkidr2hpguah28m2p1d` FOREIGN KEY (`created_by_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FKb4crtjlq4xvkamnji49ccl1rq` FOREIGN KEY (`updated_by_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FKpb6g6pahj1mr2ijg92r7m1xlh` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FKrg46bnmgbcccayv14naymqg3r` FOREIGN KEY (`school_id`) REFERENCES `school` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `teacher_grade`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teacher_grade` (
  `user_id` bigint NOT NULL,
  `grade_id` bigint NOT NULL,
  PRIMARY KEY (`user_id`,`grade_id`),
  KEY `FK80vsqge1wlie1hm420gki9yo8` (`grade_id`),
  CONSTRAINT `FK80vsqge1wlie1hm420gki9yo8` FOREIGN KEY (`grade_id`) REFERENCES `grade` (`id`),
  CONSTRAINT `FKrigicwlpvgevejuwqjahieqn8` FOREIGN KEY (`user_id`) REFERENCES `teacher` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `timetable`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `timetable` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `day_of_week` enum('FRIDAY','MONDAY','SATURDAY','SUNDAY','THURSDAY','TUESDAY','WEDNESDAY') NOT NULL,
  `end_time` time NOT NULL,
  `start_time` time NOT NULL,
  `created_by_id` bigint DEFAULT NULL,
  `updated_by_id` bigint DEFAULT NULL,
  `subject_assignment_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKn24xd1q27skxh89trbf9h8l57` (`created_by_id`),
  KEY `FKt1pv28epiweaeux8ly20krpeo` (`updated_by_id`),
  KEY `FK1fn4rmcgkls2144f007bfd391` (`subject_assignment_id`),
  CONSTRAINT `FK1fn4rmcgkls2144f007bfd391` FOREIGN KEY (`subject_assignment_id`) REFERENCES `subject_assignment` (`id`),
  CONSTRAINT `FKn24xd1q27skxh89trbf9h8l57` FOREIGN KEY (`created_by_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FKt1pv28epiweaeux8ly20krpeo` FOREIGN KEY (`updated_by_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `timetable_student`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `timetable_student` (
  `timetable_id` bigint NOT NULL,
  `student_id` bigint NOT NULL,
  PRIMARY KEY (`timetable_id`,`student_id`),
  KEY `FKee812spwmqnqtswwl3wbk9tik` (`student_id`),
  CONSTRAINT `FKee812spwmqnqtswwl3wbk9tik` FOREIGN KEY (`student_id`) REFERENCES `student` (`id`),
  CONSTRAINT `FKpxev9k1pus810cnqhwr716ahr` FOREIGN KEY (`timetable_id`) REFERENCES `timetable` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `first_name` varchar(255) DEFAULT NULL,
  `last_name` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `status` enum('ACTIVE','DELETED','INACTIVE','PENDING') DEFAULT NULL,
  `student_id` varchar(255) DEFAULT NULL,
  `title` enum('Dr','Hon','Miss','Mr','Mrs','Ms','Prof') DEFAULT NULL,
  `created_by_id` bigint DEFAULT NULL,
  `updated_by_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK9o7r2qptrh93devpob11veidj` (`created_by_id`),
  KEY `FKnede8yco9u8399icxl1aj37or` (`updated_by_id`),
  CONSTRAINT `FK9o7r2qptrh93devpob11veidj` FOREIGN KEY (`created_by_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FKnede8yco9u8399icxl1aj37or` FOREIGN KEY (`updated_by_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_roles` (
  `user_id` bigint NOT NULL,
  `role` enum('SCHOOL_ADMIN','STUDENT','SYSTEM_ADMIN','TEACHER') DEFAULT NULL,
  KEY `FK55itppkw3i07do3h7qoclqd4k` (`user_id`),
  CONSTRAINT `FK55itppkw3i07do3h7qoclqd4k` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_school`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_school` (
  `user_id` bigint NOT NULL,
  `school_id` bigint NOT NULL,
  PRIMARY KEY (`user_id`,`school_id`),
  KEY `FKks1nruv2dct07u0rdshfqi72g` (`school_id`),
  CONSTRAINT `FKks1nruv2dct07u0rdshfqi72g` FOREIGN KEY (`school_id`) REFERENCES `school` (`id`),
  CONSTRAINT `FKmyjs8jnfhemn4vnfypdcla7nk` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

