vi.mock("@hugeicons/core-free-icons", () => ({
  CheckmarkCircle02Icon: "CheckmarkCircle02Icon",
}));

vi.mock("@hugeicons/react", () => ({
  HugeiconsIcon: ({ icon, ...props }: Record<string, unknown>) => (
    <span data-testid="hugeicon" data-icon={String(icon)} {...props} />
  ),
}));

import { render, screen } from "@testing-library/react";
import { OnboardingStepIndicator } from "../onboarding-step-indicator";

describe("OnboardingStepIndicator", () => {
  it("renders all 4 step labels", () => {
    render(<OnboardingStepIndicator currentStep="create-site" />);

    expect(screen.getByText("Create Site")).toBeInTheDocument();
    expect(screen.getByText("Define Schema")).toBeInTheDocument();
    expect(screen.getByText("Create Entry")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("shows checkmark icon for completed steps", () => {
    // On step "create-entry" (index 2), steps 0 and 1 are completed
    render(<OnboardingStepIndicator currentStep="create-entry" />);

    const checkIcons = screen.getAllByTestId("hugeicon");
    // Steps "create-site" (index 0) and "create-schema" (index 1) should have check icons
    expect(checkIcons).toHaveLength(2);
    for (const icon of checkIcons) {
      expect(icon).toHaveAttribute("data-icon", "CheckmarkCircle02Icon");
    }
  });

  it("shows current step number highlighted", () => {
    // Step "create-schema" is at index 1, so step number = 2
    render(<OnboardingStepIndicator currentStep="create-schema" />);

    // The current step (index 1) should show number "2" with primary styling
    const currentStepNumber = screen.getByText("2");
    expect(currentStepNumber).toBeInTheDocument();
    expect(currentStepNumber.closest("div")).toHaveClass("bg-primary");
  });

  it("shows future step numbers in muted state", () => {
    // On step "create-site" (index 0), steps 1, 2, 3 are future
    render(<OnboardingStepIndicator currentStep="create-site" />);

    // Future step numbers: 2, 3, 4
    const step2 = screen.getByText("2");
    const step3 = screen.getByText("3");
    const step4 = screen.getByText("4");

    expect(step2.closest("div")).toHaveClass("bg-muted");
    expect(step3.closest("div")).toHaveClass("bg-muted");
    expect(step4.closest("div")).toHaveClass("bg-muted");
  });

  it("shows no checkmarks when on first step", () => {
    render(<OnboardingStepIndicator currentStep="create-site" />);

    expect(screen.queryByTestId("hugeicon")).not.toBeInTheDocument();
  });

  it("shows all steps as completed checkmarks when on the last step", () => {
    // "complete" is at index 3, so indices 0,1,2 are completed
    render(<OnboardingStepIndicator currentStep="complete" />);

    const checkIcons = screen.getAllByTestId("hugeicon");
    expect(checkIcons).toHaveLength(3);
  });
});
