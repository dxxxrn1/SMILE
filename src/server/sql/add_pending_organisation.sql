USE [SMILE];
GO

CREATE TABLE [dbo].[PendingOrganisation] (
    [PendingId] INT IDENTITY(1,1) PRIMARY KEY,
    [OrgName] VARCHAR(255) NOT NULL,
    [OrgEmail] VARCHAR(255) NOT NULL UNIQUE,
    [Type] VARCHAR(255) NOT NULL,
    [Province] VARCHAR(255) NOT NULL,
    [Password] VARCHAR(255) NOT NULL,
    [OrgDocument] VARCHAR(255) NULL,
    [OrgBio] NVARCHAR(MAX) NULL,
    [OrgProfilePic] VARCHAR(255) NULL,
    [DateCreated] DATETIME DEFAULT GETDATE(),
    [Status] VARCHAR(20) DEFAULT 'Pending'
);
GO
