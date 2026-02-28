/**
 * Shopify Storefront API client helpers.
 * Uses the Storefront GraphQL API to fetch products and collections.
 */

const API_VERSION = "2026-01";

// === GraphQL Queries ===

const PRODUCTS_QUERY = `
  query Products($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id
          handle
          title
          productType
          vendor
          tags
          availableForSale
          featuredImage {
            url
            altText
          }
          images(first: 20) {
            edges {
              node {
                id
                url
                altText
              }
            }
          }
          variants(first: 100) {
            edges {
              node {
                id
                title
                sku
                availableForSale
                price {
                  amount
                  currencyCode
                }
                compareAtPrice {
                  amount
                  currencyCode
                }
              }
            }
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const COLLECTIONS_QUERY = `
  query Collections($first: Int!, $after: String) {
    collections(first: $first, after: $after) {
      edges {
        node {
          id
          handle
          title
          image {
            url
            altText
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const SHOP_QUERY = `
  query Shop {
    shop {
      name
    }
  }
`;

// === Types ===

export interface ShopifyProduct {
  id: string;
  handle: string;
  title: string;
  productType: string;
  vendor: string;
  tags: string[];
  availableForSale: boolean;
  featuredImage: { url: string; altText: string | null } | null;
  images: {
    edges: { node: { id: string; url: string; altText: string | null } }[];
  };
  variants: {
    edges: {
      node: {
        id: string;
        title: string;
        sku: string | null;
        availableForSale: boolean;
        price: { amount: string; currencyCode: string };
        compareAtPrice: { amount: string; currencyCode: string } | null;
      };
    }[];
  };
  priceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
    maxVariantPrice: { amount: string; currencyCode: string };
  };
}

export interface ShopifyCollection {
  id: string;
  handle: string;
  title: string;
  image: { url: string; altText: string | null } | null;
}

// === GraphQL Client ===

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

async function storefrontFetch<T>(
  domain: string,
  token: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const url = `https://${domain}/api/${API_VERSION}/graphql.json`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Shopify-Storefront-Private-Token": token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify API error ${response.status}: ${text}`);
  }

  const json: GraphQLResponse<T> = await response.json();

  if (json.errors && json.errors.length > 0) {
    throw new Error(
      `Shopify GraphQL error: ${json.errors.map((e) => e.message).join(", ")}`,
    );
  }

  if (!json.data) {
    throw new Error("Shopify API returned no data");
  }

  return json.data;
}

// === Public API ===

export async function fetchProducts(
  domain: string,
  token: string,
): Promise<ShopifyProduct[]> {
  const allProducts: ShopifyProduct[] = [];
  let cursor: string | null = null;

  do {
    const variables: Record<string, unknown> = { first: 250 };
    if (cursor) {
      variables.after = cursor;
    }

    const data = await storefrontFetch<{
      products: {
        edges: { node: ShopifyProduct }[];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    }>(domain, token, PRODUCTS_QUERY, variables);

    for (const edge of data.products.edges) {
      allProducts.push(edge.node);
    }

    cursor = data.products.pageInfo.hasNextPage
      ? (data.products.pageInfo.endCursor ?? null)
      : null;
  } while (cursor && allProducts.length < 10000);

  return allProducts;
}

export async function fetchCollections(
  domain: string,
  token: string,
): Promise<ShopifyCollection[]> {
  const allCollections: ShopifyCollection[] = [];
  let cursor: string | null = null;

  do {
    const variables: Record<string, unknown> = { first: 250 };
    if (cursor) {
      variables.after = cursor;
    }

    const data = await storefrontFetch<{
      collections: {
        edges: { node: ShopifyCollection }[];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    }>(domain, token, COLLECTIONS_QUERY, variables);

    for (const edge of data.collections.edges) {
      allCollections.push(edge.node);
    }

    cursor = data.collections.pageInfo.hasNextPage
      ? (data.collections.pageInfo.endCursor ?? null)
      : null;
  } while (cursor && allCollections.length < 10000);

  return allCollections;
}

export async function testConnection(
  domain: string,
  token: string,
): Promise<{ success: boolean; shopName?: string; error?: string }> {
  try {
    const data = await storefrontFetch<{ shop: { name: string } }>(
      domain,
      token,
      SHOP_QUERY,
    );
    return { success: true, shopName: data.shop.name };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}
