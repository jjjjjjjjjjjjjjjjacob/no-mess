import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UrlField } from "../fields/url-field";

describe("UrlField", () => {
  it("renders input with type url", () => {
    render(<UrlField value="" onChange={() => {}} />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("type", "url");
  });

  it("has placeholder 'https://...'", () => {
    render(<UrlField value="" onChange={() => {}} />);
    const input = screen.getByPlaceholderText("https://...");
    expect(input).toBeInTheDocument();
  });

  it("calls onChange on input", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<UrlField value="" onChange={onChange} />);
    const input = screen.getByRole("textbox");
    await user.type(input, "h");
    expect(onChange).toHaveBeenCalledWith("h");
  });

  it("supports disabled prop", () => {
    render(<UrlField value="" onChange={() => {}} disabled />);
    const input = screen.getByRole("textbox");
    expect(input).toBeDisabled();
  });
});
