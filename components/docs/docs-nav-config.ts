export type DocNavItem = {
  title: string;
  href: string;
};

export type DocNavGroup = {
  title: string;
  items: DocNavItem[];
};

export const docsNavigation: DocNavGroup[] = [
  {
    title: "Introduction",
    items: [
      { title: "Getting Started", href: "/docs/getting-started" },
      { title: "Local Development", href: "/docs/local-dev" },
    ],
  },
  {
    title: "Reference",
    items: [
      { title: "Field Types", href: "/docs/field-types" },
      { title: "SDK Usage", href: "/docs/sdk" },
      { title: "API Reference", href: "/docs/api" },
    ],
  },
  {
    title: "Integrations",
    items: [
      { title: "Shopify", href: "/docs/shopify" },
      { title: "Preview Mode", href: "/docs/preview" },
      { title: "Live Edit", href: "/docs/live-edit" },
    ],
  },
];

export function flatNavItems(): DocNavItem[] {
  return docsNavigation.flatMap((group) => group.items);
}

export function getPrevNext(currentHref: string) {
  const items = flatNavItems();
  const index = items.findIndex((item) => item.href === currentHref);
  return {
    prev: index > 0 ? items[index - 1] : null,
    next: index < items.length - 1 ? items[index + 1] : null,
  };
}
