"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatMessages = exports.friendRequests = exports.notifications = exports.feedbacks = exports.callSessions = exports.friendRequestStatusEnum = exports.users = void 0;
var drizzle_orm_1 = require("drizzle-orm");
var pg_core_1 = require("drizzle-orm/pg-core");
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    name: (0, pg_core_1.varchar)("name", { length: 120 }).notNull(),
    email: (0, pg_core_1.varchar)("email", { length: 255 }).notNull().unique(),
    passwordHash: (0, pg_core_1.text)("password_hash").notNull(),
    status: (0, pg_core_1.varchar)("status", { length: 32 }),
    interestAreas: (0, pg_core_1.text)("interest_areas"),
    location: (0, pg_core_1.varchar)("location", { length: 160 }),
    futureGoal: (0, pg_core_1.text)("future_goal"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});
exports.friendRequestStatusEnum = (0, pg_core_1.pgEnum)("friend_request_status", [
    "pending",
    "accepted",
    "rejected",
]);
exports.callSessions = (0, pg_core_1.pgTable)("call_sessions", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    roomId: (0, pg_core_1.varchar)("room_id", { length: 200 }).notNull().unique(),
    userAId: (0, pg_core_1.uuid)("user_a_id")
        .notNull()
        .references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    userBId: (0, pg_core_1.uuid)("user_b_id")
        .notNull()
        .references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    endedByUserId: (0, pg_core_1.uuid)("ended_by_user_id").references(function () { return exports.users.id; }, {
        onDelete: "set null",
    }),
    startedAt: (0, pg_core_1.timestamp)("started_at", { withTimezone: true }).defaultNow().notNull(),
    endedAt: (0, pg_core_1.timestamp)("ended_at", { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
}, function (table) { return [
    (0, pg_core_1.index)("call_sessions_user_a_idx").on(table.userAId),
    (0, pg_core_1.index)("call_sessions_user_b_idx").on(table.userBId),
]; });
exports.feedbacks = (0, pg_core_1.pgTable)("feedbacks", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    callSessionId: (0, pg_core_1.uuid)("call_session_id")
        .notNull()
        .references(function () { return exports.callSessions.id; }, { onDelete: "cascade" }),
    reviewerId: (0, pg_core_1.uuid)("reviewer_id")
        .notNull()
        .references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    reviewedUserId: (0, pg_core_1.uuid)("reviewed_user_id")
        .notNull()
        .references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    rating: (0, pg_core_1.integer)("rating").notNull(),
    comment: (0, pg_core_1.text)("comment"),
    tags: (0, pg_core_1.text)("tags").array().notNull().default((0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["ARRAY[]::text[]"], ["ARRAY[]::text[]"])))),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
}, function (table) { return [
    (0, pg_core_1.unique)("feedback_unique_per_direction_per_call").on(table.callSessionId, table.reviewerId, table.reviewedUserId),
    (0, pg_core_1.index)("feedbacks_reviewed_user_idx").on(table.reviewedUserId),
    (0, pg_core_1.index)("feedbacks_reviewer_idx").on(table.reviewerId),
]; });
exports.notifications = (0, pg_core_1.pgTable)("notifications", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id")
        .notNull()
        .references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    type: (0, pg_core_1.text)("type").notNull(), // "friend_request" | "feedback"
    senderName: (0, pg_core_1.varchar)("sender_name", { length: 120 }).notNull(),
    comment: (0, pg_core_1.text)("comment"),
    referenceId: (0, pg_core_1.uuid)("reference_id"),
    status: (0, pg_core_1.varchar)("status", { length: 32 }),
    isRead: (0, pg_core_1.boolean)("is_read").default(false).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});
exports.friendRequests = (0, pg_core_1.pgTable)("friend_requests", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    senderId: (0, pg_core_1.uuid)("sender_id")
        .notNull()
        .references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    receiverId: (0, pg_core_1.uuid)("receiver_id")
        .notNull()
        .references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    status: (0, exports.friendRequestStatusEnum)("status").default("pending").notNull(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, function (table) { return [
    (0, pg_core_1.index)("friend_requests_sender_idx").on(table.senderId),
    (0, pg_core_1.index)("friend_requests_receiver_idx").on(table.receiverId),
]; });
exports.chatMessages = (0, pg_core_1.pgTable)("chat_messages", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    senderId: (0, pg_core_1.uuid)("sender_id")
        .notNull()
        .references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    receiverId: (0, pg_core_1.uuid)("receiver_id")
        .notNull()
        .references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    message: (0, pg_core_1.text)("message").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
}, function (table) { return [
    (0, pg_core_1.index)("chat_messages_sender_idx").on(table.senderId),
    (0, pg_core_1.index)("chat_messages_receiver_idx").on(table.receiverId),
]; });
var templateObject_1;
