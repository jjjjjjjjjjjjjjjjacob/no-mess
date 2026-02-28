import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BooleanField } from "../fields/boolean-field";

describe("BooleanField", () => {
  it("renders switch with checked state when value is true", () => {
    render(<BooleanField value={true} onChange={() => {}} />);
    const toggle = screen.getByRole("switch");
    expect(toggle).toBeChecked();
  });

  it("renders switch unchecked when value is false", () => {
    render(<BooleanField value={false} onChange={() => {}} />);
    const toggle = screen.getByRole("switch");
    expect(toggle).not.toBeChecked();
  });

  it("displays 'Yes' when value is true", () => {
    render(<BooleanField value={true} onChange={() => {}} />);
    expect(screen.getByText("Yes")).toBeInTheDocument();
  });

  it("displays 'No' when value is false", () => {
    render(<BooleanField value={false} onChange={() => {}} />);
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("calls onChange with boolean on click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BooleanField value={false} onChange={onChange} />);
    const toggle = screen.getByRole("switch");
    await user.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("supports disabled prop", () => {
    render(<BooleanField value={false} onChange={() => {}} disabled />);
    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-disabled", "true");
  });
});
