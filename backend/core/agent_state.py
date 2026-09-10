"""Small, session-scoped state primitives shared by every companion.

This module describes orchestration state only. It does not execute tools,
persist transcripts, or grant permissions to a bot.
"""
from __future__ import annotations

import secrets
import time
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any


class AgentPhase(StrEnum):
    IDLE = 'IDLE'
    LISTENING = 'LISTENING'
    UNDERSTANDING = 'UNDERSTANDING'
    CONTEXT = 'CONTEXT'
    PLANNING = 'PLANNING'
    WORKING = 'WORKING'
    VERIFYING = 'VERIFYING'
    NEEDS_APPROVAL = 'NEEDS_APPROVAL'
    SPEAKING = 'SPEAKING'
    COMPLETE = 'COMPLETE'
    BLOCKED = 'BLOCKED'
    CANCELLED = 'CANCELLED'
    ERROR = 'ERROR'


class AgentOutcome(StrEnum):
    SUCCESS = 'success'
    FAILED = 'failed'
    BLOCKED = 'blocked'
    CANCELLED = 'cancelled'
    NEEDS_APPROVAL = 'needs_approval'
    RECOVERING = 'recovering'


@dataclass
class TaskStep:
    id: str
    label: str
    status: str = 'pending'

    def public(self) -> dict[str, str]:
        return {'id': self.id, 'label': self.label, 'status': self.status}


@dataclass
class AgentTask:
    id: str
    bot_id: str
    goal: str
    phase: AgentPhase = AgentPhase.UNDERSTANDING
    status: str = 'active'
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    steps: list[TaskStep] = field(default_factory=list)
    context_refs: list[str] = field(default_factory=list)
    tool_summary: str = ''
    observation: str = ''
    verification: dict[str, Any] | None = None
    recovery: dict[str, Any] | None = None
    blocker: str = ''
    result: str = ''

    @classmethod
    def create(cls, bot_id: str, goal: str, steps: list[tuple[str, str]] | None = None) -> 'AgentTask':
        if not bot_id or not str(goal).strip():
            raise ValueError('An agent task requires a bot and user goal.')
        task_steps = [TaskStep(step_id, label) for step_id, label in (steps or [])]
        return cls(secrets.token_hex(12), bot_id, str(goal).strip(), steps=task_steps)

    def set_phase(self, phase: AgentPhase) -> 'AgentTask':
        if not isinstance(phase, AgentPhase):
            raise ValueError('Unknown agent phase.')
        self.phase = phase
        self.updated_at = time.time()
        return self

    def update_step(self, step_id: str, status: str) -> 'AgentTask':
        if status not in {'pending', 'active', 'complete', 'blocked', 'cancelled'}:
            raise ValueError('Unknown task step status.')
        for step in self.steps:
            if step.id == step_id:
                step.status = status
                self.updated_at = time.time()
                return self
        raise ValueError('Unknown task step.')

    def set_context(self, refs: list[str]) -> 'AgentTask':
        self.context_refs = [str(ref) for ref in refs[:8] if str(ref).strip()]
        self.updated_at = time.time()
        return self

    def record_verification(self, summary: dict[str, Any]) -> 'AgentTask':
        self.verification = dict(summary)
        self.updated_at = time.time()
        return self

    def record_observation(self, message: str) -> 'AgentTask':
        self.observation = str(message).strip()[:500]
        self.updated_at = time.time()
        return self

    def record_tool_activity(self, summary: str) -> 'AgentTask':
        self.tool_summary = str(summary).strip()[:240]
        self.updated_at = time.time()
        return self

    def begin_action(self) -> 'AgentTask':
        self.status = 'active'
        self.blocker = ''
        return self.set_phase(AgentPhase.WORKING)

    def offer_recovery(self, label: str) -> 'AgentTask':
        self.recovery = {'available': True, 'label': str(label).strip()[:160]}
        self.updated_at = time.time()
        return self

    def clear_recovery(self) -> 'AgentTask':
        self.recovery = None
        self.updated_at = time.time()
        return self

    def block(self, message: str) -> 'AgentTask':
        self.blocker = str(message).strip()[:500]
        self.status = AgentOutcome.BLOCKED.value
        return self.set_phase(AgentPhase.BLOCKED)

    def fail(self, message: str) -> 'AgentTask':
        self.blocker = str(message).strip()[:500]
        self.status = AgentOutcome.FAILED.value
        return self.set_phase(AgentPhase.ERROR)

    def cancel(self) -> 'AgentTask':
        self.status = AgentOutcome.CANCELLED.value
        for step in self.steps:
            if step.status in {'pending', 'active'}:
                step.status = 'cancelled'
        return self.set_phase(AgentPhase.CANCELLED)

    def complete(self, result: str = '') -> 'AgentTask':
        self.status = AgentOutcome.SUCCESS.value
        self.result = str(result).strip()[:500]
        self.clear_recovery()
        for step in self.steps:
            if step.status in {'pending', 'active'}:
                step.status = 'complete'
        return self.set_phase(AgentPhase.COMPLETE)

    def needs_approval(self, message: str = '') -> 'AgentTask':
        self.status = AgentOutcome.NEEDS_APPROVAL.value
        if message:
            self.blocker = str(message).strip()[:500]
        return self.set_phase(AgentPhase.NEEDS_APPROVAL)

    def public(self) -> dict[str, Any]:
        return {
            'id': self.id, 'botId': self.bot_id, 'goal': self.goal,
            'status': self.status, 'phase': self.phase.value,
            'createdAt': self.created_at, 'updatedAt': self.updated_at,
            'steps': [step.public() for step in self.steps],
            'contextRefs': self.context_refs[:8], 'toolSummary': self.tool_summary,
            'observation': self.observation,
            'verification': self.verification, 'recovery': self.recovery,
            'blocker': self.blocker, 'result': self.result,
        }
