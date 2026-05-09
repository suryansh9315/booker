"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Vapi from "@vapi-ai/web";
import { useAuth } from "@clerk/nextjs";

import { ASSISTANT_ID, DEFAULT_VOICE, VOICE_SETTINGS } from "@/lib/constants";
import { getVoice } from "@/lib/utils";
import { IDocument, Messages } from "@/types";
import {
  startVoiceSession,
  endVoiceSession,
} from "@/lib/actions/session.actions";

export function useLatestRef<T>(value: T) {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref;
}

const VAPI_API_KEY = process.env.NEXT_PUBLIC_VAPI_API_KEY;
const TIMER_INTERVAL_MS = 1000;
const SECONDS_PER_MINUTE = 60;
const MAX_SESSION_MINUTES = 60;

let vapi: InstanceType<typeof Vapi>;
function getVapi() {
  if (!vapi) {
    if (!VAPI_API_KEY) {
      throw new Error(
        "NEXT_PUBLIC_VAPI_API_KEY environment variable is not set",
      );
    }
    vapi = new Vapi(VAPI_API_KEY);
  }
  return vapi;
}

export type CallStatus =
  | "idle"
  | "connecting"
  | "starting"
  | "listening"
  | "thinking"
  | "speaking";

export function useVapi(document: IDocument) {
  const { userId } = useAuth();

  const [status, setStatus] = useState<CallStatus>("idle");
  const [messages, setMessages] = useState<Messages[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [currentUserMessage, setCurrentUserMessage] = useState("");
  const [duration, setDuration] = useState(0);
  const [limitError, setLimitError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const isStoppingRef = useRef(false);

  const maxDurationSeconds = MAX_SESSION_MINUTES * SECONDS_PER_MINUTE;
  const maxDurationRef = useLatestRef(maxDurationSeconds);
  const durationRef = useLatestRef(duration);
  const voice = document.persona || DEFAULT_VOICE;

  // Set up Vapi event listeners
  useEffect(() => {
    const handlers = {
      "call-start": () => {
        isStoppingRef.current = false;
        setStatus("starting");
        setCurrentMessage("");
        setCurrentUserMessage("");

        // Start duration timer
        startTimeRef.current = Date.now();
        setDuration(0);
        timerRef.current = setInterval(() => {
          if (startTimeRef.current) {
            const newDuration = Math.floor(
              (Date.now() - startTimeRef.current) / TIMER_INTERVAL_MS,
            );
            setDuration(newDuration);

            // Check duration limit
            if (newDuration >= maxDurationRef.current) {
              getVapi().stop();
              setLimitError(
                `Session time limit (${Math.floor(
                  maxDurationRef.current / SECONDS_PER_MINUTE,
                )} minutes) reached.`,
              );
            }
          }
        }, TIMER_INTERVAL_MS);
      },

      "call-end": () => {
        setStatus("idle");
        setCurrentMessage("");
        setCurrentUserMessage("");

        // Stop timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // End session tracking
        if (sessionIdRef.current) {
          endVoiceSession(sessionIdRef.current, durationRef.current).catch(
            (err) => console.error("Failed to end voice session:", err),
          );
          sessionIdRef.current = null;
        }

        startTimeRef.current = null;
      },

      "speech-start": () => {
        if (!isStoppingRef.current) {
          setStatus("speaking");
        }
      },
      "speech-end": () => {
        if (!isStoppingRef.current) {
          setStatus("listening");
        }
      },

      message: (message: {
        type: string;
        role: string;
        transcriptType: string;
        transcript: string;
      }) => {
        if (message.type !== "transcript") return;

        if (message.role === "user" && message.transcriptType === "final") {
          if (!isStoppingRef.current) {
            setStatus("thinking");
          }
          setCurrentUserMessage("");
        }

        if (message.role === "user" && message.transcriptType === "partial") {
          setCurrentUserMessage(message.transcript);
          return;
        }

        if (
          message.role === "assistant" &&
          message.transcriptType === "partial"
        ) {
          setCurrentMessage(message.transcript);
          return;
        }

        if (message.transcriptType === "final") {
          if (message.role === "assistant") setCurrentMessage("");
          if (message.role === "user") setCurrentUserMessage("");

          setMessages((prev) => {
            const isDupe = prev.some(
              (m) =>
                m.role === message.role && m.content === message.transcript,
            );
            return isDupe
              ? prev
              : [...prev, { role: message.role, content: message.transcript }];
          });
        }
      },

      error: (error: Error) => {
        console.error("Vapi error:", error);
        setStatus("idle");
        setCurrentMessage("");
        setCurrentUserMessage("");

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        if (sessionIdRef.current) {
          endVoiceSession(sessionIdRef.current, durationRef.current).catch(
            (err) =>
              console.error("Failed to end voice session on error:", err),
          );
          sessionIdRef.current = null;
        }

        const errorMessage = error.message?.toLowerCase() || "";
        if (
          errorMessage.includes("timeout") ||
          errorMessage.includes("silence")
        ) {
          setLimitError(
            "Session ended due to inactivity. Click the mic to start again.",
          );
        } else if (
          errorMessage.includes("network") ||
          errorMessage.includes("connection")
        ) {
          setLimitError(
            "Connection lost. Please check your internet and try again.",
          );
        } else {
          setLimitError(
            "Session ended unexpectedly. Click the mic to start again.",
          );
        }

        startTimeRef.current = null;
      },
    };

    // Register all handlers
    Object.entries(handlers).forEach(([event, handler]) => {
      getVapi().on(event as keyof typeof handlers, handler as () => void);
    });

    return () => {
      if (sessionIdRef.current) {
        getVapi().stop();
        endVoiceSession(sessionIdRef.current, durationRef.current).catch(
          (err) =>
            console.error("Failed to end voice session on unmount:", err),
        );
        sessionIdRef.current = null;
      }
      Object.entries(handlers).forEach(([event, handler]) => {
        getVapi().off(event as keyof typeof handlers, handler as () => void);
      });
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const start = useCallback(async () => {
    if (!userId) {
      setLimitError("Please sign in to start a voice session.");
      return;
    }

    setLimitError(null);
    setStatus("connecting");

    try {
      const result = await startVoiceSession(userId, document._id);

      if (!result.success) {
        setLimitError(
          result.error || "Failed to start session. Please try again.",
        );
        setStatus("idle");
        return;
      }

      sessionIdRef.current = result.sessionId || null;

      if (!ASSISTANT_ID) {
        setLimitError(
          "Voice assistant is not configured. Please contact support.",
        );
        setStatus("idle");
        return;
      }

      const firstMessage = `Hi there! I'm ready to help you understand your medical document. Have you had a chance to look through it yet, or would you like me to walk you through the key findings?`;

      await getVapi().start(ASSISTANT_ID, {
        firstMessage,
        variableValues: {
          title: document.title,
          source: document.source,
          documentId: document._id,
        },
        voice: {
          provider: "11labs" as const,
          voiceId: getVoice(voice).id,
          model: "eleven_turbo_v2_5" as const,
          stability: VOICE_SETTINGS.stability,
          similarityBoost: VOICE_SETTINGS.similarityBoost,
          style: VOICE_SETTINGS.style,
          useSpeakerBoost: VOICE_SETTINGS.useSpeakerBoost,
        },
      });
    } catch (err) {
      console.error("Failed to start call:", err);
      setStatus("idle");
      setLimitError("Failed to start voice session. Please try again.");
    }
  }, [document._id, document.title, document.source, voice, userId]);

  const stop = useCallback(() => {
    isStoppingRef.current = true;
    getVapi().stop();
  }, []);

  const clearError = useCallback(() => {
    setLimitError(null);
  }, []);

  const isActive =
    status === "starting" ||
    status === "listening" ||
    status === "thinking" ||
    status === "speaking";

  return {
    status,
    isActive,
    messages,
    currentMessage,
    currentUserMessage,
    duration,
    start,
    stop,
    limitError,
    maxDurationSeconds,
    clearError,
  };
}

export default useVapi;
