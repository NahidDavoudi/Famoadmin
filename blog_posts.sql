-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 18, 2026 at 10:23 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `famo`
--

-- --------------------------------------------------------

--
-- Table structure for table `blog_posts`
--

CREATE TABLE `blog_posts` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `category` varchar(50) NOT NULL,
  `excerpt` varchar(500) DEFAULT NULL,
  `content` mediumtext DEFAULT NULL,
  `cover_image` varchar(255) DEFAULT NULL,
  `meta_description` varchar(300) DEFAULT NULL,
  `published_at` datetime NOT NULL DEFAULT current_timestamp(),
  `views` int(11) NOT NULL DEFAULT 0,
  `is_published` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `blog_posts`
--

INSERT INTO `blog_posts` (`id`, `title`, `slug`, `category`, `excerpt`, `content`, `cover_image`, `meta_description`, `published_at`, `views`, `is_published`) VALUES
(1, 'برنامه‌ریزی درسی؛ کلید موفقیت در کنکور', 'konkur-study-plan', 'روش مطالعه', 'برنامه‌ریزی صحیح و منظم، مهم‌ترین فاکتور موفقیت داوطلبان کنکور است. در این مقاله با اصول طلایی برنامه‌ریزی درسی آشنا می‌شوید.', '<p>بسیاری از داوطلبان فکر می‌کنند رمز موفقیت در کنکور، مطالعه‌ی زیاد است؛ اما در واقع <strong>برنامه‌ریزی صحیح</strong> است که تفاوت را رقم می‌زند. یک برنامه‌ی اصولی باعث می‌شود هم از زمانتان بهترین استفاده را بکنید و هم از فرسودگی ذهنی جلوگیری کنید.</p>\n\n<h2>اصول طلایی برنامه‌ریزی درسی</h2>\n<p>برنامه‌ریزی درسی زمانی مؤثر است که واقع‌بینانه باشد. به‌جای اینکه ساعت‌های مطالعه را به‌صورت خیالی بالا ببرید، روی کیفیت مطالعه تمرکز کنید.</p>\n\n<h3>۱. مطالعه‌ی فعال به‌جای مطالعه‌ی منفعل</h3>\n<p>خط‌کشیدن زیر جملات کتاب، مطالعه‌ی واقعی نیست. هنگام مطالعه از خودتان سؤال بپرسید، خلاصه‌برداری کنید و در پایان هر مبحث، درس را برای خودتان بازگو کنید.</p>\n\n<h3>۲. مرور با فاصله‌گذاری زمانی</h3>\n<p>مرور مطالب در فواصل زمانی مشخص (مثلاً ۲۴ ساعت، یک هفته و یک ماه بعد) باعث تثبیت بلندمدت اطلاعات در حافظه می‌شود.</p>\n\n<ul>\n<li>هر روز از هر درس، یک مرور کوتاه داشته باشید.</li>\n<li>در پایان هفته، خلاصه‌های کل هفته را مرور کنید.</li>\n<li>قبل از آزمون‌های آزمایشی، آزمون جامع‌تر برگزار کنید.</li>\n</ul>\n\n<blockquote>برنامه‌ای که عملی نشود، بهتر از برنامه‌ای است که وجود نداشته باشد. قدرت شما در اجرای همین‌روزه‌ی برنامه است، نه نوشتن آن.</blockquote>\n\n<h2>جمع‌بندی</h2>\n<p>موفقیت در کنکور حاصلِ انباشتِ قدم‌های کوچک و روزانه است. برنامه‌ای واقع‌بینانه تنظیم کنید، آن را اجرا کنید و در مسیر با مشاوران فامو همراه باشید.</p>', NULL, 'اصول برنامه‌ریزی درسی برای کنکور؛ آموزش روش مطالعه‌ی فعال، مرور با فاصله و مدیریت زمان برای داوطلبان کنکور فامو.', '2026-09-09 12:48:28', 14, 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `blog_posts`
--
ALTER TABLE `blog_posts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `idx_blog_category` (`category`),
  ADD KEY `idx_blog_published` (`is_published`,`published_at`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `blog_posts`
--
ALTER TABLE `blog_posts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
