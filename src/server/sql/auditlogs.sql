USE [SMILE];
GO

-- Create AuditLogs table to record security audit logs of logins, logouts, registrations, and moderations.
IF OBJECT_ID('dbo.AuditLogs', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AuditLogs (
        LogId INT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NULL,
        UserEmail VARCHAR(255) NULL,
        UserType VARCHAR(50) NULL,
        Action VARCHAR(255) NOT NULL,
        Details NVARCHAR(MAX) NULL,
        IpAddress VARCHAR(45) NULL,
        Timestamp DATETIME NOT NULL CONSTRAINT DF_AuditLogs_Timestamp DEFAULT GETDATE()
    );
    PRINT 'Created AuditLogs table successfully.';
END
ELSE
BEGIN
    PRINT 'AuditLogs table already exists.';
END
GO
