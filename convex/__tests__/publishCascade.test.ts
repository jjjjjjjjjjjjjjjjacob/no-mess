import { describe, expect, it } from "vitest";
import {
  type PublishCascadeSchema,
  resolvePublishCascadeTargets,
} from "../lib/publishCascade";

function textField(name: string) {
  return { name, type: "text" as const, required: false };
}

function fragmentField(name: string, fragment: string) {
  return {
    name,
    type: "fragment" as const,
    required: false,
    fragment,
  };
}

describe("resolvePublishCascadeTargets", () => {
  it("returns only draft-only downstream schemas", () => {
    const root: PublishCascadeSchema = {
      name: "Landing Page",
      slug: "landing-page",
      kind: "template",
      status: "published",
      fields: [
        fragmentField("hero", "published-fragment"),
        fragmentField("promo", "draft-fragment"),
      ],
    };

    const schemas: PublishCascadeSchema[] = [
      {
        _id: "fragment_published",
        name: "Published Fragment",
        slug: "published-fragment",
        kind: "fragment",
        status: "published",
        fields: [textField("headline")],
        draft: {
          name: "Published Fragment",
          slug: "published-fragment",
          kind: "fragment",
          fields: [fragmentField("nested", "ignored-draft-fragment")],
        },
      },
      {
        _id: "fragment_ignored",
        name: "Ignored Draft Fragment",
        slug: "ignored-draft-fragment",
        kind: "fragment",
        status: "draft",
        fields: [textField("copy")],
        draft: {
          name: "Ignored Draft Fragment",
          slug: "ignored-draft-fragment",
          kind: "fragment",
          fields: [textField("copy")],
        },
      },
      {
        _id: "fragment_draft",
        name: "Draft Fragment",
        slug: "draft-fragment",
        kind: "fragment",
        status: "draft",
        fields: [textField("body")],
        draft: {
          name: "Draft Fragment",
          slug: "draft-fragment",
          kind: "fragment",
          fields: [textField("body")],
        },
      },
    ];

    const result = resolvePublishCascadeTargets({
      schemas,
      root: {
        schema: root,
        includeRootIfDraft: false,
        useDraftFields: true,
      },
    });

    expect(result.cascadeTargets.map((target) => target.slug)).toEqual([
      "draft-fragment",
    ]);
  });

  it("discovers recursive downstream fragments transitively and dedupes them", () => {
    const root: PublishCascadeSchema = {
      name: "Landing Page",
      slug: "landing-page",
      kind: "template",
      status: "published",
      fields: [
        fragmentField("hero", "hero-fragment"),
        fragmentField("footer", "footer-fragment"),
      ],
    };

    const schemas: PublishCascadeSchema[] = [
      {
        _id: "fragment_hero",
        name: "Hero Fragment",
        slug: "hero-fragment",
        kind: "fragment",
        status: "draft",
        fields: [textField("headline")],
        draft: {
          name: "Hero Fragment",
          slug: "hero-fragment",
          kind: "fragment",
          fields: [fragmentField("cta", "cta-fragment")],
        },
      },
      {
        _id: "fragment_footer",
        name: "Footer Fragment",
        slug: "footer-fragment",
        kind: "fragment",
        status: "draft",
        fields: [textField("links")],
        draft: {
          name: "Footer Fragment",
          slug: "footer-fragment",
          kind: "fragment",
          fields: [fragmentField("cta", "cta-fragment")],
        },
      },
      {
        _id: "fragment_cta",
        name: "CTA Fragment",
        slug: "cta-fragment",
        kind: "fragment",
        status: "draft",
        fields: [textField("label")],
        draft: {
          name: "CTA Fragment",
          slug: "cta-fragment",
          kind: "fragment",
          fields: [textField("label")],
        },
      },
    ];

    const result = resolvePublishCascadeTargets({
      schemas,
      root: {
        schema: root,
        includeRootIfDraft: false,
        useDraftFields: true,
      },
    });

    expect(result.cascadeTargets.map((target) => target.slug)).toEqual([
      "cta-fragment",
      "hero-fragment",
      "footer-fragment",
    ]);
  });

  it("handles cyclic fragment references without recursing forever", () => {
    const root: PublishCascadeSchema = {
      _id: "fragment_root",
      name: "Root Fragment",
      slug: "root-fragment",
      kind: "fragment",
      status: "draft",
      fields: [fragmentField("child", "child-fragment")],
      draft: {
        name: "Root Fragment",
        slug: "root-fragment",
        kind: "fragment",
        fields: [fragmentField("child", "child-fragment")],
      },
    };

    const schemas: PublishCascadeSchema[] = [
      root,
      {
        _id: "fragment_child",
        name: "Child Fragment",
        slug: "child-fragment",
        kind: "fragment",
        status: "draft",
        fields: [fragmentField("backref", "root-fragment")],
        draft: {
          name: "Child Fragment",
          slug: "child-fragment",
          kind: "fragment",
          fields: [fragmentField("backref", "root-fragment")],
        },
      },
    ];

    const result = resolvePublishCascadeTargets({
      schemas,
      root: {
        schema: root,
        includeRootIfDraft: true,
        useDraftFields: true,
      },
    });

    expect(result.cascadeTargets.map((target) => target.slug)).toEqual([
      "child-fragment",
      "root-fragment",
    ]);
  });
});
