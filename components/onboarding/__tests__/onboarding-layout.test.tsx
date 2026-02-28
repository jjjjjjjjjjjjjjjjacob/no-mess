vi.mock("../onboarding-step-indicator", () => ({
  OnboardingStepIndicator: ({ currentStep }: { currentStep: string }) => (
    <div data-testid="step-indicator" data-step={currentStep}>
      Step: {currentStep}
    </div>
  ),
}));

vi.mock("@hugeicons/core-free-icons", () => ({
  CheckmarkCircle02Icon: "CheckmarkCircle02Icon",
}));

vi.mock("@hugeicons/react", () => ({
  HugeiconsIcon: ({ icon, ...props }: Record<string, unknown>) => (
    <span data-testid="hugeicon" data-icon={String(icon)} {...props} />
  ),
}));

import { fireEvent, render, screen } from "@testing-library/react";
import { OnboardingLayout } from "../onboarding-layout";

describe("OnboardingLayout", () => {
  it("renders title and description", () => {
    render(
      <OnboardingLayout
        currentStep="create-site"
        title="Test Title"
        description="Test description text"
      >
        <div />
      </OnboardingLayout>,
    );

    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test description text")).toBeInTheDocument();
  });

  it("renders children", () => {
    render(
      <OnboardingLayout
        currentStep="create-site"
        title="Title"
        description="Desc"
      >
        <p data-testid="child-content">Hello child</p>
      </OnboardingLayout>,
    );

    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.getByText("Hello child")).toBeInTheDocument();
  });

  it('shows "Skip setup" button when onDismiss is provided and step is not "complete"', () => {
    render(
      <OnboardingLayout
        currentStep="create-site"
        title="Title"
        description="Desc"
        onDismiss={() => {}}
      >
        <div />
      </OnboardingLayout>,
    );

    expect(screen.getByText("Skip setup")).toBeInTheDocument();
  });

  it('hides "Skip setup" button when step is "complete"', () => {
    render(
      <OnboardingLayout
        currentStep="complete"
        title="Title"
        description="Desc"
        onDismiss={() => {}}
      >
        <div />
      </OnboardingLayout>,
    );

    expect(screen.queryByText("Skip setup")).not.toBeInTheDocument();
  });

  it('hides "Skip setup" button when onDismiss is not provided', () => {
    render(
      <OnboardingLayout
        currentStep="create-site"
        title="Title"
        description="Desc"
      >
        <div />
      </OnboardingLayout>,
    );

    expect(screen.queryByText("Skip setup")).not.toBeInTheDocument();
  });

  it('calls onDismiss when "Skip setup" is clicked', () => {
    const mockDismiss = vi.fn();

    render(
      <OnboardingLayout
        currentStep="create-site"
        title="Title"
        description="Desc"
        onDismiss={mockDismiss}
      >
        <div />
      </OnboardingLayout>,
    );

    fireEvent.click(screen.getByText("Skip setup"));
    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });

  it("renders OnboardingStepIndicator with current step", () => {
    render(
      <OnboardingLayout
        currentStep="create-schema"
        title="Title"
        description="Desc"
      >
        <div />
      </OnboardingLayout>,
    );

    const indicator = screen.getByTestId("step-indicator");
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveAttribute("data-step", "create-schema");
  });
});
