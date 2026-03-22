"use client";

import { useState, useEffect } from "react";
import { Bell, Filter, Search, X, Check, Clock, User, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Notification = {
  id: string;
  type: "friend_request" | "feedback";
  isRead: boolean;
  createdAt: Date;
  senderName: string;
  referenceId: string;
  rating?: number;
  comment?: string;
  status?: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async (resetPage = false) => {
    try {
      setLoading(true);
      const currentPage = resetPage ? 1 : page;
      
      const response = await fetch(`/api/notifications?limit=20&offset=${(currentPage - 1) * 20}`);
      const countResponse = await fetch('/api/notifications/count');

      if (response.ok) {
        const data = await response.json();
        setNotifications(prev => resetPage ? data.notifications : [...prev, ...data.notifications]);
        setFilteredNotifications(prev => resetPage ? data.notifications : [...prev, ...data.notifications]);
        setHasMore(data.hasMore);
        if (resetPage) setPage(1);
        else setPage(currentPage + 1);
      }

      if (countResponse.ok) {
        const countData = await countResponse.json();
        setUnreadCount(countData.count);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationIds: [notificationId]
        })
      });

      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      ));
      setFilteredNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = filteredNotifications.filter(n => !n.isRead).map(n => n.id);
      if (unreadIds.length === 0) return;

      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationIds: unreadIds
        })
      });

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setFilteredNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...notifications];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n => 
        n.senderName.toLowerCase().includes(query) ||
        (n.comment && n.comment.toLowerCase().includes(query))
      );
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(n => n.type === typeFilter);
    }

    // Status filter (for friend requests)
    if (statusFilter !== "all") {
      filtered = filtered.filter(n => {
        if (n.type === "friend_request") {
          return n.status === statusFilter;
        }
        return true; // For feedback, show all
      });
    }

    setFilteredNotifications(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [searchQuery, typeFilter, statusFilter, notifications]);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
        return <User className="w-4 h-4" />;
      case 'feedback':
        return <Star className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getNotificationText = (notification: Notification) => {
    switch (notification.type) {
      case 'friend_request':
        return notification.status === 'accepted' 
          ? `${notification.senderName} accepted your friend request`
          : `${notification.senderName} sent you a friend request`;
      case 'feedback':
        return `${notification.senderName} left you feedback`;
      default:
        return 'New notification';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'friend_request':
        return 'Friend Request';
      case 'feedback':
        return 'Feedback';
      default:
        return 'All Types';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-3xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
              {unreadCount} unread
            </span>
          )}
        </div>
        
        <Button onClick={markAllAsRead} variant="outline" disabled={unreadCount === 0}>
          <Check className="w-4 h-4 mr-2" />
          Mark all read
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Refine your notification list</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Search</label>
            <input
              type="text"
              placeholder="Search by name or comment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="friend_request">Friend Requests</option>
              <option value="feedback">Feedback</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Actions</label>
            <div className="flex space-x-2">
              <button 
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("all");
                  setStatusFilter("all");
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="flex items-center justify-center">
                  <X className="w-4 h-4 mr-2" />
                  Clear Filters
                </span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notification History</CardTitle>
          <CardDescription>
            {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
            {searchQuery || typeFilter !== "all" || statusFilter !== "all" ? ' (filtered)' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && notifications.length === 0 ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No notifications found</p>
              <p className="text-sm mt-2">Try adjusting your filters or check back later</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border transition-all ${
                    !notification.isRead 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-full ${
                        !notification.isRead ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-gray-900">
                            {getNotificationText(notification)}
                          </h3>
                          {!notification.isRead && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              New
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(notification.createdAt)}</span>
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                            {getTypeLabel(notification.type)}
                          </span>
                          {notification.type === 'friend_request' && notification.status && (
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              notification.status === 'accepted' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {notification.status}
                            </span>
                          )}
                        </div>
                        
                        {notification.type === 'feedback' && notification.rating && (
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 text-yellow-500" />
                              <span className="font-medium">{notification.rating}/5</span>
                            </div>
                          </div>
                        )}
                        
                        {notification.comment && (
                          <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                            "{notification.comment}"
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {!notification.isRead && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              {hasMore && (
                <div className="flex justify-center py-4">
                  <button 
                    onClick={() => fetchNotifications(false)}
                    disabled={loading}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    Load More
                  </button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}