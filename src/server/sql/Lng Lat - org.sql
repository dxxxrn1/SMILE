USE [SMILE]
GO

ALTER TABLE [dbo].[Opportunities]
ADD [Lat] DECIMAL(9, 6) NULL,
    [Lng] DECIMAL(9, 6) NULL;
GO