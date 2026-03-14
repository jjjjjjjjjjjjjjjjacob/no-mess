import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { NumberField } from "../fields/number-field";

describe("NumberField", () => {
  it("renders input with type number", () => {
    render(<NumberField value={42} onChange={() => {}} />);
    const input = screen.getByRole("spinbutton");
    expect(input).toHaveAttribute("type", "number");
  });

  it("calls onChange with numeric value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<NumberField value={0} onChange={onChange} />);
    const input = screen.getByRole("spinbutton");
    await user.clear(input);
    await user.type(input, "7");
    expect(onChange).toHaveBeenCalledWith(undefined);
    expect(onChange).toHaveBeenCalledWith(7);
  });

  it("allows replacing a zero value without restoring the leading zero", async () => {
    const user = userEvent.setup();

    function ControlledField() {
      const [value, setValue] = useState<number | undefined>(0);
      return <NumberField value={value} onChange={setValue} />;
    }

    render(<ControlledField />);
    const input = screen.getByRole("spinbutton");
    await user.clear(input);
    expect(input).toHaveValue(null);

    await user.type(input, "100");
    expect(input).toHaveValue(100);
  });

  it("supports disabled prop", () => {
    render(<NumberField value={0} onChange={() => {}} disabled />);
    const input = screen.getByRole("spinbutton");
    expect(input).toBeDisabled();
  });
});
