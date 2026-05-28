USE [SMILE];
GO

-- Create table to track newsletter subscriptions
CREATE TABLE [dbo].[NewsletterSubscriptions] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [Email] VARCHAR(255) NOT NULL UNIQUE,
    [DateSubscribed] DATETIME DEFAULT GETDATE()
);
GO
