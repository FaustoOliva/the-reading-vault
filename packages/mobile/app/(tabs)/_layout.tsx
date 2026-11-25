/**
 * Tabs Layout
 * Responsive navigation shell.
 *
 * Rules:
 * - Below 1024px (and on native) keep the bottom tab bar
 * - On web at >= 1024px replace it with a left sidebar, reusing the same routes
 * - The web canvas widens to the shared content cap; each page owns its own
 *   padding and its own column layout
 */

import { Tabs } from "expo-router";
import React from "react";
import { View, useWindowDimensions } from "react-native";

import { AppSidebar } from "@/components/ui/appSidebar";
import { HapticTab } from "@/components/ui/hapticTab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Background } from "@/constants/colors";
import {
  Breakpoint,
  CONTENT_MAX_WIDTH,
  SIDEBAR_WIDTH,
} from "@/constants/layout";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/useColorScheme";

const isWeb = process.env.EXPO_OS === "web";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { width } = useWindowDimensions();

  const showSidebar = isWeb && width >= Breakpoint.wide;
  const sidebarWidth =
    width >= Breakpoint.ultraWide
      ? SIDEBAR_WIDTH.ultraWide
      : SIDEBAR_WIDTH.wide;

  const tabs = (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: showSidebar ? { display: "none" } : undefined,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Books",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="book.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create-book"
        options={{
          title: "Add Book",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="plus.circle.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="log-session"
        options={{
          title: "Log Session",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="book.pages" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="statistics"
        options={{
          title: "Stats",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="chart.pie.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: "AI",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="sparkles" color={color} />
          ),
        }}
      />
    </Tabs>
  );

  if (!isWeb) {
    return tabs;
  }

  return (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        backgroundColor: Background.primary,
      }}
    >
      {showSidebar ? <AppSidebar width={sidebarWidth} /> : null}
      <View style={{ flex: 1, alignItems: "center" }}>
        <View style={{ flex: 1, width: "100%", maxWidth: CONTENT_MAX_WIDTH }}>
          {tabs}
        </View>
      </View>
    </View>
  );
}
