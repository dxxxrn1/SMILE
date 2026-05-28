USE [SMILE];
GO

-- Add organisation profile columns
ALTER TABLE [dbo].[Organisation]
    ADD OrgBio       NVARCHAR(MAX) NULL,
        OrgProfilePic NVARCHAR(255) NULL;
GO
