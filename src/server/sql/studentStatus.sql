-- migration_add_status.sql
-- Run once in SSMS against your SMILE database.
-- Adds a Status column to Student and Organisation if it doesn't already exist.
 
-- Student
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.Student') AND name = 'Status'
)
BEGIN
  ALTER TABLE dbo.Student
  ADD Status NVARCHAR(20) NOT NULL
    CONSTRAINT DF_Student_Status DEFAULT 'active'
    CHECK (Status IN ('active', 'suspended'));
 
  PRINT 'Added Status column to Student';
END
 
-- Organisation
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.Organisation') AND name = 'Status'
)
BEGIN
  ALTER TABLE dbo.Organisation
  ADD Status NVARCHAR(20) NOT NULL
    CONSTRAINT DF_Organisation_Status DEFAULT 'active'
    CHECK (Status IN ('active', 'suspended'));
 
  PRINT 'Added Status column to Organisation';
END