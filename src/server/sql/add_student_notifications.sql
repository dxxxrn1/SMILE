IF OBJECT_ID('dbo.StudentNotifications', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.StudentNotifications (
    NotificationID INT IDENTITY(1,1) PRIMARY KEY,
    StuID INT NOT NULL,
    AppID INT NULL,
    Title NVARCHAR(150) NOT NULL,
    Message NVARCHAR(1000) NOT NULL,
    NotificationType VARCHAR(40) NOT NULL,
    IsRead BIT NOT NULL CONSTRAINT DF_StudentNotifications_IsRead DEFAULT 0,
    DateCreated DATETIME NOT NULL CONSTRAINT DF_StudentNotifications_DateCreated DEFAULT GETDATE(),
    CONSTRAINT FK_StudentNotifications_Student FOREIGN KEY (StuID) REFERENCES dbo.Student(StuID) ON DELETE CASCADE
  );
END
