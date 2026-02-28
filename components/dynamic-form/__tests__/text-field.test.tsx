import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TextField } from "../fields/text-field";

describe("TextField", () => {
  it("renders input with value", () => {
    render(<TextField value="hello" onChange={() => {}} />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("hello");
  });

  it("calls onChange with new value on input", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TextField value="" onChange={onChange} />);
    const input = screen.getByRole("textbox");
    await user.type(input, "a");
    expect(onChange).toHaveBeenCalledWith("a");
  });

  it("supports disabled prop", () => {
    render(<TextField value="test" onChange={() => {}} disabled />);
    const input = screen.getByRole("textbox");
    expect(input).toBeDisabled();
  });
});
