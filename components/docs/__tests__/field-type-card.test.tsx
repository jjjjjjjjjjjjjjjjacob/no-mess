import { render, screen } from "@testing-library/react";
import { FieldTypeCard } from "../field-type-card";

describe("FieldTypeCard", () => {
  const defaultProps = {
    name: "Short Text",
    type: "string",
    description: "A single line of text",
    storedValue: "string",
  };

  it("renders the field name", () => {
    render(<FieldTypeCard {...defaultProps} />);
    expect(
      screen.getByRole("heading", { name: "Short Text" }),
    ).toBeInTheDocument();
  });

  it("renders the type as a badge", () => {
    render(<FieldTypeCard {...defaultProps} />);
    const badge = screen.getByText("string", {
      selector: "[data-slot='badge']",
    });
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("data-variant", "secondary");
  });

  it("renders the description", () => {
    render(<FieldTypeCard {...defaultProps} />);
    expect(screen.getByText("A single line of text")).toBeInTheDocument();
  });

  it("renders the stored value label", () => {
    render(<FieldTypeCard {...defaultProps} />);
    expect(screen.getByText("Stored as:")).toBeInTheDocument();
  });

  it("renders the stored value in a code element", () => {
    render(<FieldTypeCard {...defaultProps} />);
    const codeEl = screen.getByText("string", {
      selector: "code",
    });
    expect(codeEl).toBeInTheDocument();
    expect(codeEl.tagName).toBe("CODE");
  });

  it("does not render options when not provided", () => {
    render(<FieldTypeCard {...defaultProps} />);
    expect(screen.queryByText("Options:")).not.toBeInTheDocument();
  });

  it("does not render options when empty array is provided", () => {
    render(<FieldTypeCard {...defaultProps} options={[]} />);
    expect(screen.queryByText("Options:")).not.toBeInTheDocument();
  });

  it("renders options when provided", () => {
    render(
      <FieldTypeCard
        {...defaultProps}
        options={["option-a", "option-b", "option-c"]}
      />,
    );
    expect(screen.getByText("Options:")).toBeInTheDocument();
    expect(
      screen.getByText("option-a, option-b, option-c"),
    ).toBeInTheDocument();
  });

  it("renders with different field data", () => {
    render(
      <FieldTypeCard
        name="Number"
        type="number"
        description="A numeric value"
        storedValue="float64"
      />,
    );
    expect(screen.getByRole("heading", { name: "Number" })).toBeInTheDocument();
    expect(screen.getByText("A numeric value")).toBeInTheDocument();
    expect(
      screen.getByText("float64", { selector: "code" }),
    ).toBeInTheDocument();
  });

  it("renders the name as an h3 heading", () => {
    render(<FieldTypeCard {...defaultProps} />);
    const heading = screen.getByRole("heading", { name: "Short Text" });
    expect(heading.tagName).toBe("H3");
  });
});
