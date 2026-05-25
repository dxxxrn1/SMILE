-- ============================================================
-- SMILE: Support Tickets Table
-- Run this ONCE against the SMILE database.
-- ============================================================

USE [SMILE];
GO



    CREATE TABLE [dbo].[SupportTickets] (
        [TicketID]       INT           IDENTITY(1,1) NOT NULL,
        [SubmitterID]    INT           NOT NULL,            -- StuID or OrgId
        [SubmitterType]  VARCHAR(10)   NOT NULL,            -- 'student' or 'org'
        [TicketType]     VARCHAR(30)   NOT NULL,            -- 'Bug / Issue' or 'Report'
        [Subject]        VARCHAR(255)  NOT NULL,
        [Description]    NVARCHAR(MAX) NOT NULL,
        [Status]         VARCHAR(20)   NOT NULL DEFAULT 'Open', -- 'Open' | 'Resolved'
        [AdminFeedback]  NVARCHAR(MAX) NULL,
        [DateCreated]    DATETIME      NOT NULL DEFAULT GETDATE(),
        [DateResolved]   DATETIME      NULL,

        CONSTRAINT [PK_SupportTickets]    PRIMARY KEY CLUSTERED ([TicketID] ASC),
        CONSTRAINT [CHK_TicketStatus]     CHECK ([Status]        IN ('Open', 'Resolved')),
        CONSTRAINT [CHK_SubmitterType]    CHECK ([SubmitterType] IN ('student', 'org'))
 
