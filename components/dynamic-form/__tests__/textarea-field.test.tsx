import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TextareaField } from "../fields/textarea-field";

describe("TextareaField", () => {
  it("renders textarea with value", () => {
    render(<TextareaField value="some content" onChange={() => {}} />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveValue("some content");
  });

  it("has rows=4", () => {
    render(<TextareaField value="" onChange={() => {}} />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveAttribute("rows", "4");
  });

  it("calls onChange on input", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TextareaField value="" onChange={onChange} />);
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "x");
    expect(onChange).toHaveBeenCalledWith("x");
  });

  it("supports disabled prop", () => {
    render(<TextareaField value="" onChange={() => {}} disabled />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toBeDisabled();
  });
});
