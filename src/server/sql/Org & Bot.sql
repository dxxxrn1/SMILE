USE [master]
GO
/****** Object:  Database [SMILE]    Script Date: 2026/04/19 01:49:03 ******/
CREATE DATABASE [SMILE]
 CONTAINMENT = NONE
 ON  PRIMARY 
( NAME = N'SMILE', FILENAME = N'C:\Program Files\Microsoft SQL Server\MSSQL17.SQLEXPRESS\MSSQL\DATA\SMILE.mdf' , SIZE = 8192KB , MAXSIZE = UNLIMITED, FILEGROWTH = 65536KB )
 LOG ON 
( NAME = N'SMILE_log', FILENAME = N'C:\Program Files\Microsoft SQL Server\MSSQL17.SQLEXPRESS\MSSQL\DATA\SMILE_log.ldf' , SIZE = 8192KB , MAXSIZE = 2048GB , FILEGROWTH = 65536KB )
 WITH CATALOG_COLLATION = DATABASE_DEFAULT, LEDGER = OFF
GO
ALTER DATABASE [SMILE] SET COMPATIBILITY_LEVEL = 170
GO
IF (1 = FULLTEXTSERVICEPROPERTY('IsFullTextInstalled'))
begin
EXEC [SMILE].[dbo].[sp_fulltext_database] @action = 'enable'
end
GO
ALTER DATABASE [SMILE] SET ANSI_NULL_DEFAULT OFF 
GO
ALTER DATABASE [SMILE] SET ANSI_NULLS OFF 
GO
ALTER DATABASE [SMILE] SET ANSI_PADDING OFF 
GO
ALTER DATABASE [SMILE] SET ANSI_WARNINGS OFF 
GO
ALTER DATABASE [SMILE] SET ARITHABORT OFF 
GO
ALTER DATABASE [SMILE] SET AUTO_CLOSE ON 
GO
ALTER DATABASE [SMILE] SET AUTO_SHRINK OFF 
GO
ALTER DATABASE [SMILE] SET AUTO_UPDATE_STATISTICS ON 
GO
ALTER DATABASE [SMILE] SET CURSOR_CLOSE_ON_COMMIT OFF 
GO
ALTER DATABASE [SMILE] SET CURSOR_DEFAULT  GLOBAL 
GO
ALTER DATABASE [SMILE] SET CONCAT_NULL_YIELDS_NULL OFF 
GO
ALTER DATABASE [SMILE] SET NUMERIC_ROUNDABORT OFF 
GO
ALTER DATABASE [SMILE] SET QUOTED_IDENTIFIER OFF 
GO
ALTER DATABASE [SMILE] SET RECURSIVE_TRIGGERS OFF 
GO
ALTER DATABASE [SMILE] SET  ENABLE_BROKER 
GO
ALTER DATABASE [SMILE] SET AUTO_UPDATE_STATISTICS_ASYNC OFF 
GO
ALTER DATABASE [SMILE] SET DATE_CORRELATION_OPTIMIZATION OFF 
GO
ALTER DATABASE [SMILE] SET TRUSTWORTHY OFF 
GO
ALTER DATABASE [SMILE] SET ALLOW_SNAPSHOT_ISOLATION OFF 
GO
ALTER DATABASE [SMILE] SET PARAMETERIZATION SIMPLE 
GO
ALTER DATABASE [SMILE] SET READ_COMMITTED_SNAPSHOT OFF 
GO
ALTER DATABASE [SMILE] SET HONOR_BROKER_PRIORITY OFF 
GO
ALTER DATABASE [SMILE] SET RECOVERY SIMPLE 
GO
ALTER DATABASE [SMILE] SET  MULTI_USER 
GO
ALTER DATABASE [SMILE] SET PAGE_VERIFY CHECKSUM  
GO
ALTER DATABASE [SMILE] SET DB_CHAINING OFF 
GO
ALTER DATABASE [SMILE] SET FILESTREAM( NON_TRANSACTED_ACCESS = OFF ) 
GO
ALTER DATABASE [SMILE] SET TARGET_RECOVERY_TIME = 60 SECONDS 
GO
ALTER DATABASE [SMILE] SET DELAYED_DURABILITY = DISABLED 
GO
ALTER DATABASE [SMILE] SET OPTIMIZED_LOCKING = OFF 
GO
ALTER DATABASE [SMILE] SET ACCELERATED_DATABASE_RECOVERY = OFF  
GO
ALTER DATABASE [SMILE] SET QUERY_STORE = ON
GO
ALTER DATABASE [SMILE] SET QUERY_STORE (OPERATION_MODE = READ_WRITE, CLEANUP_POLICY = (STALE_QUERY_THRESHOLD_DAYS = 30), DATA_FLUSH_INTERVAL_SECONDS = 900, INTERVAL_LENGTH_MINUTES = 60, MAX_STORAGE_SIZE_MB = 1000, QUERY_CAPTURE_MODE = AUTO, SIZE_BASED_CLEANUP_MODE = AUTO, MAX_PLANS_PER_QUERY = 200, WAIT_STATS_CAPTURE_MODE = ON)
GO
USE [SMILE]
GO
/****** Object:  Table [dbo].[Organisation]    Script Date: 2026/04/19 01:49:04 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Organisation](
	[OrgId] [int] IDENTITY(1,1) NOT NULL,
	[OrgName] [varchar](255) NOT NULL,
	[OrgEmail] [varchar](255) NOT NULL,
	[Type] [varchar](255) NOT NULL,
	[Province] [varchar](255) NOT NULL,
	[Password] [varchar](255) NOT NULL,
	[DateCreated] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[OrgId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SavedCareerDocs]    Script Date: 2026/04/19 01:49:04 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SavedCareerDocs](
	[DocID] [int] IDENTITY(1,1) NOT NULL,
	[StuID] [int] NULL,
	[CareerTitle] [varchar](100) NULL,
	[DocContent] [nvarchar](max) NULL,
	[DateSaved] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[DocID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Student]    Script Date: 2026/04/19 01:49:04 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Student](
	[StuID] [int] IDENTITY(1,1) NOT NULL,
	[StuName] [varchar](255) NOT NULL,
	[StuLastName] [varchar](255) NOT NULL,
	[StuEmail] [varchar](255) NOT NULL,
	[StuProvince] [varchar](255) NOT NULL,
	[StuEducationLevel] [varchar](255) NOT NULL,
	[StuPassword] [varchar](255) NOT NULL,
	[DateCreated] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[StuID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[StudentInterests]    Script Date: 2026/04/19 01:49:04 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[StudentInterests](
	[InterestID] [int] IDENTITY(1,1) NOT NULL,
	[StuID] [int] NULL,
	[Realistic] [int] NULL,
	[Investigative] [int] NULL,
	[Artistic] [int] NULL,
	[Social] [int] NULL,
	[Enterprising] [int] NULL,
	[Conventional] [int] NULL,
	[TopInterest] [varchar](50) NULL,
	[DateTaken] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[InterestID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET IDENTITY_INSERT [dbo].[SavedCareerDocs] ON 

INSERT [dbo].[SavedCareerDocs] ([DocID], [StuID], [CareerTitle], [DocContent], [DateSaved]) VALUES (1, 1, N'Career Path - Conventional', N'## Career Overview
As a individuals with Conventional interests, you are likely to thrive in careers that involve structured and organized work, often with a focus on details and analytics. Based on our conversation, three potential career paths in South Africa that align with your interests are Chartered Accountant, Data Analyst, and Systems Analyst. These careers offer a range of opportunities to work with numbers, data, and systems in a structured environment, making them well-suited for individuals who enjoy detail-oriented and analytical work.

## Required High School Subjects
To pursue these careers, it is essential to have a strong foundation in the following high school subjects:
- Mathematics
- Accounting (for Chartered Accountant)
- Computer Science (for Data Analyst and Systems Analyst)
- Statistics (for Data Analyst)

## Qualifications & Universities in South Africa
Several universities in South Africa offer qualifications that can lead to these careers. Some of the top universities include:
- University of Witwatersrand
- University of Johannesburg
- University of Pretoria
- University of Cape Town
- Stellenbosch University

The typical qualifications required are:
- Bachelor''s degree in Accounting, Computer Science, or Information Systems (3 years)
- Postgraduate degree or certification in Accounting (1-2 years) for Chartered Accountant

## Step-by-Step Career Path
Here is a step-by-step guide to help you get started:
1. **Complete high school**: Focus on achieving excellent grades in Mathematics, Accounting, Computer Science, and Statistics.
2. **Apply for a Bachelor''s degree**: Choose a relevant field such as Accounting, Computer Science, or Information Systems at a reputable university in South Africa.
3. **Gain practical experience**: Participate in internships or volunteer programs to gain hands-on experience in your chosen field.
4. **Pursue a postgraduate degree or certification**: If you''re interested in becoming a Chartered Accountant, consider pursuing a postgraduate degree or certification.
5. **Join professional associations**: Networking with professionals in your field can help you stay updated on industry trends and best practices.

## Expected ZAR Salary Progression
The expected salary range for these careers in South Africa is:
- Chartered Accountant: R350,000 - R800,000 per annum
- Data Analyst: R240,000 - R480,000 per annum
- Systems Analyst: R280,000 - R550,000 per annum
Salaries can vary based on experience, location, and industry, but here is a rough estimate of salary progression:
- Entry-level (0-3 years of experience): R200,000 - R350,000 per annum
- Mid-level (4-7 years of experience): R350,000 - R600,000 per annum
- Senior-level (8-12 years of experience): R600,000 - R1,000,000 per annum

## Top Employers in South Africa
Some of the top employers in South Africa for these careers include:
- Deloitte
- KPMG
- PwC
- Ernst & Young
- Standard Bank
- ABSA
- Nedbank
- FNB
- Government institutions

## Next Steps to Get Started
To get started, we recommend the following next steps:
- Research universities and their programs in South Africa
- Reach out to professionals in your desired field for guidance and mentorship
- Prepare for and take the National Benchmark Tests (NBTs) to assess your academic readiness for university
- Apply for a Bachelor''s degree program at a reputable university in South Africa
- Start building your professional network by attending industry events and joining relevant associations', CAST(N'2026-04-17T01:47:04.520' AS DateTime))
INSERT [dbo].[SavedCareerDocs] ([DocID], [StuID], [CareerTitle], [DocContent], [DateSaved]) VALUES (2, 1, N'Career Path - Conventional', N'## Career Overview
As a Conventional personality type, a career in accounting can be a great fit for you, Darren. Accountants play a vital role in managing and analyzing financial data for individuals, businesses, or organizations. They prepare and examine financial records, ensuring accuracy and compliance with laws and regulations. As an accountant, you''ll have opportunities to work in various industries, including public practice, commerce, and government. With experience and additional qualifications, you can also move into specialized roles, such as forensic accounting or taxation.

## Required High School Subjects
To become an accountant in South Africa, you''ll typically need to have completed the following subjects in high school:
* Mathematics (HG)
* Accounting
* Business Studies
* English (HG)

## Qualifications & Universities in South Africa
To pursue a career in accounting, you can consider the following qualifications and universities in South Africa:
* Bachelor of Commerce in Accounting (BCom Accounting): 3 years
* Bachelor of Accounting (BAcc): 3 years
* Certificate in Accounting (e.g., Certified Bookkeeper): 1-2 years
* Postgraduate qualifications, such as a Master''s in Accounting or a Certificate in Accounting Technician (CAT), may require an additional 1-2 years of study
Some of the top universities in South Africa for accounting include:
* University of Cape Town
* University of Witwatersrand
* University of Pretoria
* University of Johannesburg
* Stellenbosch University

## Step-by-Step Career Path
Here''s a step-by-step career path to become an accountant in South Africa:
1. **Complete high school**: Focus on achieving good grades in Mathematics, Accounting, Business Studies, and English.
2. **Choose a university and qualification**: Select a university and qualification that aligns with your career goals, such as a BCom Accounting or BAcc.
3. **Complete a degree**: Study for 3 years to complete a degree in accounting.
4. **Gain practical experience**: Participate in internships or volunteer programs to gain practical experience in accounting.
5. **Consider postgraduate qualifications**: Pursue a postgraduate qualification, such as a Master''s in Accounting or a Certificate in Accounting Technician (CAT), to enhance your skills and knowledge.
6. **Obtain professional certifications**: Obtain professional certifications, such as the Certified Public Accountant (CPA) or Chartered Accountant (CA), to demonstrate your expertise and commitment to the profession.
7. **Stay up-to-date with industry developments**: Continuously update your skills and knowledge to stay current with industry developments and regulatory changes.

## Expected ZAR Salary Progression
The salary range for accountants in South Africa can vary depending on factors such as location, experience, and industry. Here''s an expected ZAR salary progression for accountants:
* Junior Accountant (0-3 years of experience): R180,000 - R300,000 per year
* Senior Accountant (4-7 years of experience): R350,000 - R550,000 per year
* Financial Manager (8-12 years of experience): R600,000 - R900,000 per year
* Chief Financial Officer (CFO): R1,000,000 - R1,500,000 per year

## Top Employers in South Africa
As an accountant, you can work for a variety of employers in South Africa, including:
* Public accounting firms (e.g., Deloitte, Ernst & Young, KPMG, PwC)
* Private companies (e.g., banks, retail, manufacturing)
* Government institutions (e.g., National Treasury, South African Revenue Service)
* Non-profit organizations

## Next Steps to Get Started
To get started on your career path as an accountant, Darren, consider the following next steps:
* Research universities and qualifications in South Africa to find the best fit for your career goals.
* Reach out to professionals in the field to learn more about their experiences and gain insights into the industry.
* Focus on developing your skills and knowledge in accounting, finance, and business.
* Stay up-to-date with industry developments and regulatory changes to remain competitive in the job market.
* Consider participating in internships or volunteer programs to gain practical experience in accounting.', CAST(N'2026-04-17T01:54:49.990' AS DateTime))
SET IDENTITY_INSERT [dbo].[SavedCareerDocs] OFF
GO
SET IDENTITY_INSERT [dbo].[Student] ON 

INSERT [dbo].[Student] ([StuID], [StuName], [StuLastName], [StuEmail], [StuProvince], [StuEducationLevel], [StuPassword], [DateCreated]) VALUES (1, N'Darren', N'forster', N'darrenforster3@gmail.com', N'gauteng', N'grade-12', N'$2b$10$5Ri8HMd2E3EAtWbXdNCazuP0idEeEA0pMRrqY1F4UjXX42hPHXINy', CAST(N'2026-04-16T03:08:47.143' AS DateTime))
INSERT [dbo].[Student] ([StuID], [StuName], [StuLastName], [StuEmail], [StuProvince], [StuEducationLevel], [StuPassword], [DateCreated]) VALUES (2, N'd', N'f', N'pngforster@gmail.com', N'western-cape', N'postgraduate', N'$2b$10$IZbpx0HW/XJsdCgC9wRvYOujKzjvRL19gBy5w73ksFY40/HUMXpae', CAST(N'2026-04-17T01:21:41.957' AS DateTime))
SET IDENTITY_INSERT [dbo].[Student] OFF
GO
SET IDENTITY_INSERT [dbo].[StudentInterests] ON 

INSERT [dbo].[StudentInterests] ([InterestID], [StuID], [Realistic], [Investigative], [Artistic], [Social], [Enterprising], [Conventional], [TopInterest], [DateTaken]) VALUES (3, 1, 1, 4, 1, 2, 5, 5, N'Conventional', CAST(N'2026-04-17T01:53:13.760' AS DateTime))
INSERT [dbo].[StudentInterests] ([InterestID], [StuID], [Realistic], [Investigative], [Artistic], [Social], [Enterprising], [Conventional], [TopInterest], [DateTaken]) VALUES (4, 2, 5, 1, 4, 3, 1, 1, N'Realistic', CAST(N'2026-04-17T02:19:35.100' AS DateTime))
SET IDENTITY_INSERT [dbo].[StudentInterests] OFF
GO
/****** Object:  Index [UQ__StudentI__6CDFAB74733AEEEE]    Script Date: 2026/04/19 01:49:04 ******/
ALTER TABLE [dbo].[StudentInterests] ADD UNIQUE NONCLUSTERED 
(
	[StuID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Organisation] ADD  DEFAULT (getdate()) FOR [DateCreated]
GO
ALTER TABLE [dbo].[SavedCareerDocs] ADD  DEFAULT (getdate()) FOR [DateSaved]
GO
ALTER TABLE [dbo].[Student] ADD  DEFAULT (getdate()) FOR [DateCreated]
GO
ALTER TABLE [dbo].[StudentInterests] ADD  DEFAULT ((0)) FOR [Realistic]
GO
ALTER TABLE [dbo].[StudentInterests] ADD  DEFAULT ((0)) FOR [Investigative]
GO
ALTER TABLE [dbo].[StudentInterests] ADD  DEFAULT ((0)) FOR [Artistic]
GO
ALTER TABLE [dbo].[StudentInterests] ADD  DEFAULT ((0)) FOR [Social]
GO
ALTER TABLE [dbo].[StudentInterests] ADD  DEFAULT ((0)) FOR [Enterprising]
GO
ALTER TABLE [dbo].[StudentInterests] ADD  DEFAULT ((0)) FOR [Conventional]
GO
ALTER TABLE [dbo].[StudentInterests] ADD  DEFAULT (getdate()) FOR [DateTaken]
GO
ALTER TABLE [dbo].[SavedCareerDocs]  WITH CHECK ADD FOREIGN KEY([StuID])
REFERENCES [dbo].[Student] ([StuID])
GO
ALTER TABLE [dbo].[StudentInterests]  WITH CHECK ADD FOREIGN KEY([StuID])
REFERENCES [dbo].[Student] ([StuID])
GO
USE [master]
GO
ALTER DATABASE [SMILE] SET  READ_WRITE 
GO
