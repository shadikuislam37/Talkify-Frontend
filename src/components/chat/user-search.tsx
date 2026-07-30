"use client";

import React, { useState, useEffect } from "react";
import { useChat } from "@/hooks/use-chat";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Loader2, X } from "lucide-react";
import { UserProfile } from "@/types";



interface UserSearchProps {
  onSelectUser: (user: UserProfile) => void;
  isLoadingAction?: boolean;
  placeholder?: string;
  excludeUserIds?: string[]; // 🌟 নির্দিষ্ট ইউজারদের (যেমন: নিজেকে বা অলরেডি যুক্ত হওয়া মেম্বারদের) লিস্ট থেকে হাইড করার জন্য
}

export function UserSearch({
  onSelectUser,
  isLoadingAction = false,
  placeholder = "Search user by name or email...",
  excludeUserIds = [],
}: UserSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce logic (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Centralized useChat object-এর useSearchUsers
  const { data: rawUsers = [], isLoading } = useChat.useSearchUsers(debouncedQuery);

  // 🌟 এক্সক্লুড করা আইডিগুলো বাদ দিয়ে লিস্ট ফিল্টার করা
  const users = (rawUsers as UserProfile[]).filter(
    (user) => !excludeUserIds.includes(user.id)
  );

  return (
    <div className="space-y-4 py-2">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 pr-8"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* User Results List */}
      <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
        {isLoading ? (
          <div className="flex justify-center items-center py-6 text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">Searching users...</span>
          </div>
        ) : users.length === 0 && debouncedQuery.length > 0 ? (
          <p className="text-center text-xs text-muted-foreground py-6">
            No users found.
          </p>
        ) : (
          users.map((user) => (
            <button
              key={user.id}
              type="button"
              disabled={isLoadingAction}
              onClick={() => onSelectUser(user)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors text-left disabled:opacity-50"
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={user.image || undefined} />
                <AvatarFallback>
                  {user.name ? user.name.slice(0, 2).toUpperCase() : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="font-medium text-sm truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
              {isLoadingAction && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}