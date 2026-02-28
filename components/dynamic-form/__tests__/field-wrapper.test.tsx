import { render, screen } from "@testing-library/react";
import { FieldWrapper } from "../field-wrapper";

describe("FieldWrapper", () => {
  it("renders the label text", () => {
    render(
      <FieldWrapper label="Title" required={false}>
        <input />
      </FieldWrapper>,
    );
    expect(screen.getByText("Title")).toBeInTheDocument();
  });

  it("renders the required indicator when required is true", () => {
    render(
      <FieldWrapper label="Name" required>
        <input />
      </FieldWrapper>,
    );
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("does not render the required indicator when required is false", () => {
    render(
      <FieldWrapper label="Optional Field" required={false}>
        <input />
      </FieldWrapper>,
    );
    expect(screen.queryByText("*")).not.toBeInTheDocument();
  });

  it("does not render the required indicator when required is undefined", () => {
    render(
      <FieldWrapper label="Optional Field">
        <input />
      </FieldWrapper>,
    );
    expect(screen.queryByText("*")).not.toBeInTheDocument();
  });

  it("renders the description text when provided", () => {
    render(
      <FieldWrapper label="Email" description="Enter your email address">
        <input />
      </FieldWrapper>,
    );
    expect(screen.getByText("Enter your email address")).toBeInTheDocument();
  });

  it("does not render description when not provided", () => {
    render(
      <FieldWrapper label="Email">
        <input />
      </FieldWrapper>,
    );
    // No paragraph for description should exist
    const paragraphs = document.querySelectorAll("p");
    expect(paragraphs.length).toBe(0);
  });

  it("renders children", () => {
    render(
      <FieldWrapper label="Field">
        <span data-testid="child">Child Content</span>
      </FieldWrapper>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("sets htmlFor on label to match field id pattern", () => {
    render(
      <FieldWrapper label="Username">
        <input />
      </FieldWrapper>,
    );
    const label = screen.getByText("Username").closest("label");
    expect(label).toHaveAttribute("for", "field-Username");
  });
});
