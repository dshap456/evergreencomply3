-- LMS Test Users Seed
-- This adds test accounts for Learner and Team Manager roles to test LMS functionality

-- Test Learner User
INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at",
                            "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token",
                            "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at",
                            "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin",
                            "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change",
                            "phone_change_token", "phone_change_sent_at", "email_change_token_current",
                            "email_change_confirm_status", "banned_until", "reauthentication_token",
                            "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous")
VALUES ('00000000-0000-0000-0000-000000000000', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'authenticated',
        'authenticated', 'learner@test.com', '$2a$10$b3ZPpU6TU3or30QzrXnZDuATPAx2pPq3JW.sNaneVY3aafMSuR4yi',
        '2024-01-01 10:00:00.000000+00', NULL, '', NULL, '', NULL, '', '', NULL,
        '2024-01-01 10:00:00.000000+00', '{"provider": "email", "providers": ["email"]}',
        '{"sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "name": "Test Learner", "email": "learner@test.com", "email_verified": true, "phone_verified": false}',
        NULL, '2024-01-01 10:00:00.000000+00', '2024-01-01 10:00:00.000000+00', NULL, NULL, '', '', NULL, '', 0, NULL, '',
        NULL, false, NULL, false),

-- Test Team Manager User
       ('00000000-0000-0000-0000-000000000000', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', 'authenticated',
        'authenticated', 'manager@test.com', '$2a$10$b3ZPpU6TU3or30QzrXnZDuATPAx2pPq3JW.sNaneVY3aafMSuR4yi',
        '2024-01-01 11:00:00.000000+00', NULL, '', NULL, '', NULL, '', '', NULL,
        '2024-01-01 11:00:00.000000+00', '{"provider": "email", "providers": ["email"]}',
        '{"sub": "b2c3d4e5-f6g7-8901-bcde-f23456789012", "name": "Test Manager", "email": "manager@test.com", "email_verified": true, "phone_verified": false}',
        NULL, '2024-01-01 11:00:00.000000+00', '2024-01-01 11:00:00.000000+00', NULL, NULL, '', '', NULL, '', 0, NULL, '',
        NULL, false, NULL, false);

-- Insert corresponding identities
INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at",
                                 "updated_at", "id")
VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        '{"sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "name": "Test Learner", "email": "learner@test.com", "email_verified": true, "phone_verified": false}',
        'email', '2024-01-01 10:00:00.000000+00', '2024-01-01 10:00:00.000000+00', '2024-01-01 10:00:00.000000+00',
        'learner-identity-test-uuid'),
       ('b2c3d4e5-f6g7-8901-bcde-f23456789012', 'b2c3d4e5-f6g7-8901-bcde-f23456789012',
        '{"sub": "b2c3d4e5-f6g7-8901-bcde-f23456789012", "name": "Test Manager", "email": "manager@test.com", "email_verified": true, "phone_verified": false}',
        'email', '2024-01-01 11:00:00.000000+00', '2024-01-01 11:00:00.000000+00', '2024-01-01 11:00:00.000000+00',
        'manager-identity-test-uuid');

-- Create personal accounts for the test users (these are created automatically by triggers, but adding explicitly for clarity)
INSERT INTO "public"."accounts" ("id", "primary_owner_user_id", "name", "slug", "email", "is_personal_account",
                                 "updated_at", "created_at", "created_by", "updated_by", "picture_url", "public_data")
VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Test Learner', NULL, 'learner@test.com',
        true, '2024-01-01 10:00:00.000000+00', '2024-01-01 10:00:00.000000+00', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', NULL, NULL, '{}'),
       ('b2c3d4e5-f6g7-8901-bcde-f23456789012', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', 'Test Manager', NULL, 'manager@test.com',
        true, '2024-01-01 11:00:00.000000+00', '2024-01-01 11:00:00.000000+00', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', NULL, NULL, '{}');

-- Create a test team account that the manager can manage
INSERT INTO "public"."accounts" ("id", "primary_owner_user_id", "name", "slug", "email", "is_personal_account",
                                 "updated_at", "created_at", "created_by", "updated_by", "picture_url", "public_data")
VALUES ('c3d4e5f6-g7h8-9012-cdef-345678901234', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', 'Test Team Company', 'test-team-company', 'team@test.com',
        false, '2024-01-01 11:30:00.000000+00', '2024-01-01 11:30:00.000000+00', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', NULL, NULL, '{}');

-- Add the team manager as owner of the team account
INSERT INTO "public"."accounts_memberships" ("user_id", "account_id", "account_role", "created_at", "updated_at",
                                             "created_by", "updated_by")
VALUES ('b2c3d4e5-f6g7-8901-bcde-f23456789012', 'c3d4e5f6-g7h8-9012-cdef-345678901234', 'owner',
        '2024-01-01 11:30:00.000000+00', '2024-01-01 11:30:00.000000+00', NULL, NULL);

-- Add the learner as a member of the team (so the manager can assign courses)
INSERT INTO "public"."accounts_memberships" ("user_id", "account_id", "account_role", "created_at", "updated_at",
                                             "created_by", "updated_by")
VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c3d4e5f6-g7h8-9012-cdef-345678901234', 'member',
        '2024-01-01 12:00:00.000000+00', '2024-01-01 12:00:00.000000+00', NULL, NULL);

-- Sample course enrollments for testing (assuming we have courses created)
-- These will be added once we have actual courses in the system

COMMENT ON TABLE auth.users IS 'LMS Test Users: learner@test.com (password: password), manager@test.com (password: password)';