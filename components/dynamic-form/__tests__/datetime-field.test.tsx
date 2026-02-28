import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DatetimeField } from "../fields/datetime-field";

describe("DatetimeField", () => {
  it("renders input with type datetime-local", () => {
    render(<DatetimeField value="" onChange={() => {}} />);
    const input = document.querySelector('input[type="datetime-local"]');
    expect(input).toBeInTheDocument();
  });

  it("renders with the provided value", () => {
    render(<DatetimeField value="2025-06-15T10:30" onChange={() => {}} />);
    const input = document.querySelector(
      'input[type="datetime-local"]',
    ) as HTMLInputElement;
    expect(input.value).toBe("2025-06-15T10:30");
  });

  it("calls onChange on input", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DatetimeField value="" onChange={onChange} />);
    const input = document.querySelector(
      'input[type="datetime-local"]',
    ) as HTMLInputElement;
    await user.type(input, "2025-01-01T12:00");
    expect(onChange).toHaveBeenCalled();
  });

  it("supports disabled prop", () => {
    render(<DatetimeField value="" onChange={() => {}} disabled />);
    const input = document.querySelector(
      'input[type="datetime-local"]',
    ) as HTMLInputElement;
    expect(input).toBeDisabled();
  });
});
