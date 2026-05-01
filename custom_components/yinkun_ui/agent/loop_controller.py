"""Turn loop protection for the HAUI Agent Kernel."""
from __future__ import annotations

from dataclasses import dataclass


class TurnLimitError(Exception):
    """Raised when a turn exceeds configured safety limits."""


@dataclass(slots=True)
class LoopController:
    """Small guard for future tool loops and recursive handoffs."""

    max_steps: int = 6
    current_step: int = 0

    def next_step(self, label: str) -> None:
        """Advance one controlled step."""
        self.current_step += 1
        if self.current_step > self.max_steps:
            raise TurnLimitError(f"Agent turn exceeded max steps while running {label}")
