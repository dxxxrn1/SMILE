USE [SMILE];
GO

-- Add the new columns to the Student table
ALTER TABLE [dbo].[Student] ADD StuBio NVARCHAR(MAX) NULL;
ALTER TABLE [dbo].[Student] ADD ProfilePicUrl NVARCHAR(255) NULL;