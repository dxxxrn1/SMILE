USE [SMILE]
GO

-- 1. OPPORTUNITIES TABLE
-- Stores the posts created by organizations.
-- Linked to[Organisation] table via [OrgId].
CREATE TABLE [dbo].[Opportunities](
	[OppID] [int] IDENTITY(1,1) PRIMARY KEY,
	[OrgId] [int] NOT NULL, 
	[Title] [varchar](120) NOT NULL,
	[OppType] [varchar](50) NOT NULL,
	[Province] [varchar](50) NOT NULL,
	[Description] [varchar](max) NOT NULL,
	[Requirements] [varchar](max) NULL,
	[ApplicationLink] [varchar](255) NULL,
	[MaxApplicants] [int] NULL,
	[ApplicationDeadline] [date] NOT NULL,
	[StartDate] [date] NULL,
	[Status] [varchar](20) DEFAULT 'Active', 
	[DateCreated] [datetime] DEFAULT GETDATE(),

	
	CONSTRAINT FK_Opp_Org FOREIGN KEY ([OrgId]) 
	REFERENCES [dbo].[Organisation]([OrgId]) ON DELETE CASCADE
);
GO

-- 2. APPLICATIONS TABLE
-- The bridge connecting your existing [Student] table to [Opportunities]
CREATE TABLE [dbo].[Applications](
	[AppID] [int] IDENTITY(1,1) PRIMARY KEY,
	[OppID] [int] NOT NULL,
	[StuID] [int] NOT NULL, 
	[Status] [varchar](20) DEFAULT 'Pending', -- Pending, Reviewed, Shortlisted, Interview, Approved, Rejected
	[DateApplied] [datetime] DEFAULT GETDATE(),

	CONSTRAINT FK_App_Opp FOREIGN KEY ([OppID]) 
	REFERENCES [dbo].[Opportunities]([OppID]) ON DELETE CASCADE,
	
	CONSTRAINT FK_App_Stu FOREIGN KEY ([StuID]) 
	REFERENCES [dbo].[Student]([StuID]) ON DELETE CASCADE,

	CONSTRAINT UQ_Student_Opp UNIQUE ([OppID], [StuID]) 
);
GO

-- 3. FEEDBACK TABLE
-- Students can rate the opportunities.
CREATE TABLE [dbo].[Feedback](
	[FeedbackID] [int] IDENTITY(1,1) PRIMARY KEY,
	[OppID] [int] NOT NULL,
	[StuID] [int] NOT NULL,
	[Rating] [int] CHECK (Rating >= 1 AND Rating <= 5), -- 1 to 5 star rating
	[Comment] [varchar](max) NULL,
	[DateSubmitted] [datetime] DEFAULT GETDATE(),

	CONSTRAINT FK_Feedback_Opp FOREIGN KEY ([OppID]) 
	REFERENCES [dbo].[Opportunities]([OppID]) ON DELETE CASCADE,
	
	CONSTRAINT FK_Feedback_Stu FOREIGN KEY ([StuID]) 
	REFERENCES [dbo].[Student]([StuID]) ON DELETE CASCADE
);
GO
