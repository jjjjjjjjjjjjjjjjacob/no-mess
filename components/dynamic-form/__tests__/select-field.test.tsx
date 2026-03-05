import { vi } from "vitest";

vi.mock("@hugeicons/core-free-icons", () => ({
  ArrowDown01Icon: "ArrowDown01Icon",
  ArrowUp01Icon: "ArrowUp01Icon",
  Tick02Icon: "Tick02Icon",
  UnfoldMoreIcon: "UnfoldMoreIcon",
}));

vi.mock("@hugeicons/react", () => ({
  HugeiconsIcon: (props: Record<string, unknown>) => (
    <span data-testid="hugeicon" {...props} />
  ),
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SelectField } from "../fields/select-field";

const choices = [
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
];

describe("SelectField", () => {
  it("renders select trigger with placeholder", () => {
    render(<SelectField value="" onChange={() => {}} choices={choices} />);
    expect(screen.getByText("Select...")).toBeInTheDocument();
  });

  it("shows selected value text", () => {
    render(<SelectField value="draft" onChange={() => {}} choices={choices} />);
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("calls onChange on selection", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SelectField value="" onChange={onChange} choices={choices} />);

    // Focus the trigger and use keyboard navigation since Base UI's
    // popup doesn't fully open in JSDOM (hidden attribute persists)
    const trigger = screen.getByRole("combobox");
    await user.click(trigger);
    // ArrowDown opens dropdown + highlights first item (Draft)
    await user.keyboard("{ArrowDown}");
    // ArrowDown again moves to Published
    await user.keyboard("{ArrowDown}");
    // Enter selects the highlighted item
    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledWith("published");
  });

  it("supports disabled prop", () => {
    render(
      <SelectField value="" onChange={() => {}} choices={choices} disabled />,
    );
    const trigger = screen.getByRole("combobox");
    expect(trigger).toBeDisabled();
  });
});
