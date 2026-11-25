/**
 * AppSidebar Component
 * Left navigation for wide web screens (>= 1024px).
 *
 * Rules:
 * - Same routes as the tab bar, so deep links are unchanged
 * - Wide layouts get a wider rail; the nav column never shrinks below 44px targets
 * - Items are grouped so the rail carries hierarchy instead of a flat list
 * - Minimum 44px targets and a visible keyboard focus ring (browser default)
 * - Active item is announced through accessibilityState, not color alone
 */

import { Link, usePathname, type Href } from "expo-router";
import { ScrollView, Pressable, Text, View } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  Background,
  Border,
  Interactive,
  Text as TextColors,
} from "@/constants/colors";
import { SIDEBAR_WIDTH } from "@/constants/layout";

type IconName = React.ComponentProps<typeof IconSymbol>["name"];

interface NavItem {
  href: Href;
  label: string;
  icon: IconName;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Library",
    items: [
      { href: "/", label: "Books", icon: "book.fill" },
      { href: "/create-book", label: "Add Book", icon: "plus.circle.fill" },
      { href: "/log-session", label: "Log Session", icon: "book.pages" },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/statistics", label: "Stats", icon: "chart.pie.fill" },
      { href: "/ai", label: "AI", icon: "sparkles" },
    ],
  },
];

function isItemActive(pathname: string, href: Href): boolean {
  if (typeof href !== "string") {
    return false;
  }

  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link href={item.href} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={item.label}
        accessibilityState={{ selected: isActive }}
      >
        {({ pressed }) => (
          // Visual styles live on an inner View: Link asChild merges the child
          // style through Radix Slot, which drops style callbacks on web.
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              minHeight: 44,
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 10,
              borderCurve: "continuous",
              backgroundColor: isActive
                ? Interactive.primary.default
                : pressed
                  ? Interactive.secondary.pressed
                  : "transparent",
            }}
          >
            <IconSymbol
              name={item.icon}
              size={22}
              color={isActive ? Interactive.primary.text : TextColors.secondary}
            />
            <Text
              style={{
                fontSize: 15,
                fontWeight: isActive ? "700" : "500",
                color: isActive ? Interactive.primary.text : TextColors.primary,
              }}
            >
              {item.label}
            </Text>
          </View>
        )}
      </Pressable>
    </Link>
  );
}

interface AppSidebarProps {
  /** Rail width; the tabs layout picks the value for the current breakpoint. */
  width?: number;
}

export function AppSidebar({ width = SIDEBAR_WIDTH.wide }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <View
      role="navigation"
      accessibilityLabel="Main navigation"
      style={{
        width,
        flexShrink: 0,
        backgroundColor: Background.surface,
        borderRightWidth: 1,
        borderRightColor: Border.default,
      }}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 28,
          paddingBottom: 24,
          gap: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 12, gap: 2 }}>
          <Text
            accessibilityRole="header"
            style={{
              fontSize: 18,
              fontWeight: "800",
              letterSpacing: -0.2,
              color: TextColors.primary,
            }}
          >
            The Reading Vault
          </Text>
          <Text style={{ fontSize: 12, color: TextColors.tertiary }}>
            Reading journal
          </Text>
        </View>

        {NAV_GROUPS.map((group) => (
          <View key={group.label} style={{ gap: 4 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 0.8,
                textTransform: "uppercase",
                color: TextColors.tertiary,
                paddingHorizontal: 12,
                paddingBottom: 4,
              }}
            >
              {group.label}
            </Text>
            {group.items.map((item) => (
              <SidebarLink
                key={item.label}
                item={item}
                isActive={isItemActive(pathname, item.href)}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
