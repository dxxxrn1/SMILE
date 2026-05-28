USE [SMILE];
GO

-- Add document column to Organisation table to support verification files
ALTER TABLE [dbo].[Organisation]
    ADD OrgDocument VARCHAR(255) NULL;
GO
