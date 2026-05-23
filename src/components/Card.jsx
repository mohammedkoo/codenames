import { useState } from "react";
import { gameAudio } from "../audio";
import { socket } from "../socket";

// ─── Skull SVG for Assassin card ───────────────────────────────────────────
const SkullIcon = ({ size = "w-10 h-10", opacity = "opacity-70" }) => (
  <svg
    viewBox="0 0 64 64"
    className={`${size} ${opacity}`}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M32 4C19.3 4 9 14.3 9 27c0 7.6 3.7 14.4 9.4 18.6V52a4 4 0 004 4h19.2a4 4 0 004-4v-6.4C51.3 41.4 55 34.6 55 27 55 14.3 44.7 4 32 4zm-8 30a4 4 0 110-8 4 4 0 010 8zm8 8h-0.1l-0.2-4h0.6l-0.2 4H32zm8-8a4 4 0 110-8 4 4 0 010 8z" />
  </svg>
);

// ─── Corner Dots (top corners) ─────────────────────────────────────────────
const CornerDots = ({ color = "bg-slate-600" }) => (
  <>
    <span className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${color}`} />
    <span className={`absolute top-2 left-2 w-1.5 h-1.5 rounded-full ${color}`} />
  </>
);

// ─── HUD Brackets (all 4 corners) ─────────────────────────────────────────
const HudBrackets = ({ colorClass = "border-slate-600/50" }) => (
  <>
    <span className={`absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 ${colorClass} rounded-tr`} />
    <span className={`absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 ${colorClass} rounded-tl`} />
    <span className={`absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 ${colorClass} rounded-br`} />
    <span className={`absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 ${colorClass} rounded-bl`} />
  </>
);

// ─── Bottom Label Bar ──────────────────────────────────────────────────────
const BottomLabel = ({ label, dotColor = "bg-slate-500", textColor = "text-slate-500" }) => (
  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2.5 py-1.5 border-t border-white/5">
    <span className={`text-[9px] font-black uppercase tracking-widest font-orbitron ${textColor}`}>
      {label}
    </span>
    <span className="flex gap-0.5">
      <span className={`w-1 h-1 rounded-full ${dotColor}`} />
      <span className={`w-1 h-1 rounded-full ${dotColor}`} />
    </span>
  </div>
);

function Card({ card, onFirstClick, onConfirmClick, disabled, playerRole, selection, currentTurn }) {
  const [clicked, setClicked] = useState(false);
  const isViewerSpymaster = playerRole && playerRole.role === "spymaster";
  const viewerTeam = playerRole && playerRole.team;

  const isRed = card.type === "red";
  const isBlue = card.type === "blue";
  const isAssassin = card.type === "killer";
  const isNeutral = card.type === "neutral";

  const isMySelection = selection && selection.playerId === socket.id;
  const hasSelection = !!selection;

  const triggerClickFeedback = () => {
    setClicked(true);
    setTimeout(() => setClicked(false), 200);
  };

  const handleClick = () => {
    if (disabled || card.revealed) return;
    triggerClickFeedback();
    gameAudio.playHover();
    if (isMySelection) {
      onConfirmClick();
    } else {
      onFirstClick();
    }
  };

  const getSelectionGlow = () => {
    if (!hasSelection) return "";
    if (currentTurn === "blue") return "card-selected-blue card-select-pulse";
    if (currentTurn === "red") return "card-selected-red card-select-pulse";
    return "card-selected-amber card-select-pulse";
  };

  const renderSelectionBadge = () => {
    if (!hasSelection || card.revealed) return null;
    if (isMySelection) {
      return (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-slate-950 border border-emerald-500/60 rounded-full px-2.5 py-0.5 shadow-[0_0_12px_rgba(16,185,129,0.4)] whitespace-nowrap">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          <span className="text-[10px] font-black text-emerald-400 font-cairo tracking-wide">اضغط ✓ للتأكيد</span>
        </div>
      );
    }
    return (
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-slate-950 border border-amber-400/60 rounded-full px-2.5 py-0.5 shadow-[0_0_12px_rgba(245,158,11,0.35)] whitespace-nowrap">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400" />
        </span>
        <span className="text-[10px] font-black text-amber-300 font-cairo tracking-wide">{selection.playerName}</span>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════════
  // REVEALED STATE
  // ════════════════════════════════════════════════════════════════════════
  if (card.revealed) {
    const showCheck = isViewerSpymaster && viewerTeam && card.type === viewerTeam;

    if (isAssassin) {
      return (
        <div
          className="assassin-pulse relative flex flex-col items-center justify-center rounded-2xl overflow-hidden border-2 border-red-900/60 cursor-default"
          style={{
            aspectRatio: "3/4",
            background: "linear-gradient(160deg, #050000 0%, #0a0002 50%, #050000 100%)",
          }}
        >
          <CornerDots color="bg-red-900/60" />
          <HudBrackets colorClass="border-red-900/60" />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at center, transparent 20%, rgba(100,0,0,0.7) 100%)" }}
          />
          {/* Diagonal hatch */}
          <div
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              background:
                "repeating-linear-gradient(-45deg, rgba(200,0,0,0.4) 0px, transparent 1px, transparent 8px, rgba(200,0,0,0.4) 9px)",
            }}
          />
          <div className="relative z-10 flex flex-col items-center gap-2 mb-5">
            <SkullIcon size="w-10 h-10" opacity="opacity-80" />
            <span
              className="text-sm sm:text-base font-cairo font-black text-red-400/70 tracking-widest line-through decoration-red-700"
              style={{ textShadow: "0 0 10px rgba(180,0,0,0.5)" }}
            >
              {card.text}
            </span>
          </div>
          <BottomLabel label="ASSASSIN" dotColor="bg-red-900/80" textColor="text-red-900/80" />
        </div>
      );
    }

    if (isRed) {
      return (
        <div
          className={`relative flex flex-col items-center justify-center rounded-2xl overflow-hidden border-2 border-red-500/80 ${showCheck ? "opacity-50" : ""}`}
          style={{
            aspectRatio: "3/4",
            background: "linear-gradient(160deg, #3b0015 0%, #1a0008 40%, #2d000f 100%)",
            boxShadow: "0 0 20px rgba(255,30,80,0.3), inset 0 0 30px rgba(180,0,40,0.2)",
          }}
        >
          <CornerDots color="bg-red-500/60" />
          <HudBrackets colorClass="border-red-500/50" />
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-red-500/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-red-950/50 to-transparent pointer-events-none" />
          <span
            className="relative z-10 font-cairo font-black text-red-100 tracking-wide flex flex-col items-center gap-1.5 px-2 text-center mb-5"
            style={{ textShadow: "0 0 15px rgba(255,80,100,0.5)" }}
          >
            <span className="text-sm sm:text-base md:text-lg">{card.text}</span>
            {showCheck && (
              <span className="text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)] text-base">✓</span>
            )}
          </span>
          <BottomLabel label="RED" dotColor="bg-red-500/60" textColor="text-red-500/60" />
        </div>
      );
    }

    if (isBlue) {
      return (
        <div
          className={`relative flex flex-col items-center justify-center rounded-2xl overflow-hidden border-2 border-cyan-500/80 ${showCheck ? "opacity-50" : ""}`}
          style={{
            aspectRatio: "3/4",
            background: "linear-gradient(160deg, #001828 0%, #000d1a 40%, #001020 100%)",
            boxShadow: "0 0 20px rgba(0,200,255,0.25), inset 0 0 30px rgba(0,80,140,0.2)",
          }}
        >
          <CornerDots color="bg-cyan-500/60" />
          <HudBrackets colorClass="border-cyan-500/50" />
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-blue-950/50 to-transparent pointer-events-none" />
          <span
            className="relative z-10 font-cairo font-black text-cyan-100 tracking-wide flex flex-col items-center gap-1.5 px-2 text-center mb-5"
            style={{ textShadow: "0 0 15px rgba(0,220,255,0.5)" }}
          >
            <span className="text-sm sm:text-base md:text-lg">{card.text}</span>
            {showCheck && (
              <span className="text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)] text-base">✓</span>
            )}
          </span>
          <BottomLabel label="BLUE" dotColor="bg-cyan-500/60" textColor="text-cyan-500/60" />
        </div>
      );
    }

    // Neutral revealed
    return (
      <div
        className="relative flex flex-col items-center justify-center rounded-2xl overflow-hidden border border-slate-700/40"
        style={{
          aspectRatio: "3/4",
          background: "linear-gradient(160deg, #1a1f2e 0%, #111520 100%)",
        }}
      >
        <CornerDots color="bg-slate-700/40" />
        <HudBrackets colorClass="border-slate-700/30" />
        <span className="relative z-10 font-cairo font-medium text-slate-500 text-sm sm:text-base px-2 text-center mb-5">
          {card.text}
        </span>
        <BottomLabel label="NEUTRAL" dotColor="bg-slate-600/50" textColor="text-slate-600/50" />
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // SPYMASTER VIEW (unrevealed) — color-coded
  // ════════════════════════════════════════════════════════════════════════
  if (isViewerSpymaster) {
    const isOwnTarget = viewerTeam && card.type === viewerTeam;

    if (isAssassin) {
      return (
        <div
          className="assassin-pulse relative flex flex-col items-center justify-center rounded-2xl overflow-hidden border-2 border-red-950/80 cursor-default"
          style={{
            aspectRatio: "3/4",
            background: "linear-gradient(160deg, #050000 0%, #0a0002 50%, #050000 100%)",
          }}
        >
          <CornerDots color="bg-red-950/60" />
          <HudBrackets colorClass="border-red-950/60" />
          <div
            className="absolute inset-0 pointer-events-none opacity-15"
            style={{
              background:
                "repeating-linear-gradient(-45deg, rgba(180,0,0,0.3) 0px, transparent 1px, transparent 8px, rgba(180,0,0,0.3) 9px)",
            }}
          />
          <div className="relative z-10 flex flex-col items-center gap-2 mb-5">
            <SkullIcon size="w-8 h-8" opacity="opacity-50" />
            <span className="text-sm font-cairo font-black text-red-800/70 tracking-wide px-2 text-center">
              {card.text}
            </span>
          </div>
          <BottomLabel label="ASSASSIN" dotColor="bg-red-900/60" textColor="text-red-900/60" />
        </div>
      );
    }

    if (isRed) {
      return (
        <div
          className="relative flex flex-col items-center justify-center rounded-2xl overflow-hidden border-2 cursor-default"
          style={{
            aspectRatio: "3/4",
            background: isOwnTarget
              ? "linear-gradient(160deg, #2a0010 0%, #150008 50%, #1e0008 100%)"
              : "linear-gradient(160deg, #180008 0%, #0e0004 100%)",
            borderColor: isOwnTarget ? "rgba(239,68,68,0.65)" : "rgba(127,29,29,0.4)",
            boxShadow: isOwnTarget
              ? "0 0 18px rgba(255,40,80,0.2), inset 0 0 20px rgba(120,0,30,0.15)"
              : "none",
          }}
        >
          {isOwnTarget && (
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />
          )}
          <CornerDots color={isOwnTarget ? "bg-red-400/60" : "bg-red-900/30"} />
          <HudBrackets colorClass={isOwnTarget ? "border-red-400/50" : "border-red-900/30"} />
          <span
            className={`relative z-10 font-cairo font-bold text-sm sm:text-base tracking-wide px-2 text-center mb-5 ${isOwnTarget ? "text-red-200" : "text-red-400/60"}`}
            style={isOwnTarget ? { textShadow: "0 0 12px rgba(255,60,80,0.4)" } : {}}
          >
            {card.text}
          </span>
          <BottomLabel
            label="RED"
            dotColor={isOwnTarget ? "bg-red-400/60" : "bg-red-900/40"}
            textColor={isOwnTarget ? "text-red-400/60" : "text-red-900/50"}
          />
        </div>
      );
    }

    if (isBlue) {
      return (
        <div
          className="relative flex flex-col items-center justify-center rounded-2xl overflow-hidden border-2 cursor-default"
          style={{
            aspectRatio: "3/4",
            background: isOwnTarget
              ? "linear-gradient(160deg, #001525 0%, #000b14 50%, #001020 100%)"
              : "linear-gradient(160deg, #000c15 0%, #000608 100%)",
            borderColor: isOwnTarget ? "rgba(34,211,238,0.6)" : "rgba(22,78,99,0.4)",
            boxShadow: isOwnTarget
              ? "0 0 18px rgba(0,200,255,0.2), inset 0 0 20px rgba(0,60,100,0.15)"
              : "none",
          }}
        >
          {isOwnTarget && (
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
          )}
          <CornerDots color={isOwnTarget ? "bg-cyan-400/60" : "bg-cyan-900/30"} />
          <HudBrackets colorClass={isOwnTarget ? "border-cyan-400/50" : "border-cyan-900/30"} />
          <span
            className={`relative z-10 font-cairo font-bold text-sm sm:text-base tracking-wide px-2 text-center mb-5 ${isOwnTarget ? "text-cyan-100" : "text-cyan-400/60"}`}
            style={isOwnTarget ? { textShadow: "0 0 12px rgba(0,220,255,0.4)" } : {}}
          >
            {card.text}
          </span>
          <BottomLabel
            label="BLUE"
            dotColor={isOwnTarget ? "bg-cyan-400/60" : "bg-cyan-900/40"}
            textColor={isOwnTarget ? "text-cyan-400/60" : "text-cyan-900/50"}
          />
        </div>
      );
    }

    // Neutral spymaster
    return (
      <div
        className="relative flex flex-col items-center justify-center rounded-2xl overflow-hidden border border-slate-700/30 cursor-default"
        style={{
          aspectRatio: "3/4",
          background: "linear-gradient(160deg, #14161f 0%, #0e1018 100%)",
        }}
      >
        <CornerDots color="bg-slate-700/30" />
        <HudBrackets colorClass="border-slate-700/25" />
        <span className="relative z-10 font-cairo font-medium text-slate-400/70 text-sm sm:text-base px-2 text-center mb-5">
          {card.text}
        </span>
        <BottomLabel label="NEUTRAL" dotColor="bg-slate-600/40" textColor="text-slate-600/40" />
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // NORMAL PLAYER VIEW — unrevealed, interactive
  // ════════════════════════════════════════════════════════════════════════
  const selectionGlow = getSelectionGlow();

  return (
    <div className="relative">
      {renderSelectionBadge()}

      {/* Green Checkmark Corner Button */}
      {isMySelection && (
        <button
          onClick={(e) => { e.stopPropagation(); onConfirmClick(); }}
          title="تأكيد الاختيار"
          className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 flex items-center justify-center text-slate-950 font-black text-base border-2 border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.9)] z-30 cursor-pointer transition-all duration-150 hover:scale-110 active:scale-95 animate-bounce-subtle"
        >
          ✓
        </button>
      )}

      <button
        onClick={handleClick}
        onMouseEnter={() => !disabled && gameAudio.playHover()}
        className={`
          group relative w-full flex flex-col items-center justify-center
          rounded-2xl overflow-hidden border-2 text-center
          transition-all duration-200 select-none
          ${clicked ? "scale-[0.96]" : ""}
          ${hasSelection ? selectionGlow : ""}
          ${!hasSelection && !disabled ? "card-interactive-border" : ""}
          ${disabled && !hasSelection
            ? "cursor-not-allowed opacity-55 border-slate-800/30"
            : "cursor-pointer"
          }
        `}
        style={{
          aspectRatio: "3/4",
          background: hasSelection
            ? currentTurn === "blue"
              ? "linear-gradient(160deg, #001525 0%, #000d1a 100%)"
              : currentTurn === "red"
                ? "linear-gradient(160deg, #250010 0%, #12000a 100%)"
                : "linear-gradient(160deg, #1a1200 0%, #0e0c00 100%)"
            : disabled
              ? "linear-gradient(160deg, #0e1018 0%, #090b12 100%)"
              : "linear-gradient(160deg, #141928 0%, #0b0f1c 50%, #111726 100%)",
        }}
      >
        {/* Corner dots */}
        <CornerDots
          color={
            hasSelection && currentTurn === "blue"
              ? "bg-cyan-500/60"
              : hasSelection && currentTurn === "red"
                ? "bg-red-500/60"
                : "bg-slate-600/40"
          }
        />

        {/* HUD brackets */}
        <HudBrackets
          colorClass={
            hasSelection && currentTurn === "blue"
              ? "border-cyan-500/50"
              : hasSelection && currentTurn === "red"
                ? "border-red-500/50"
                : !disabled
                  ? "border-slate-600/40 group-hover:border-cyan-500/40"
                  : "border-slate-700/20"
          }
        />

        {/* Top edge glow line */}
        <span className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:via-white/20 transition-all duration-300 pointer-events-none" />

        {/* Hover shimmer sweep */}
        {!disabled && !hasSelection && (
          <span className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.03] to-transparent -translate-y-full group-hover:translate-y-0 transition-transform duration-700 ease-out pointer-events-none" />
        )}

        {/* My selection glow overlay */}
        {isMySelection && (
          <span className="absolute inset-0 bg-gradient-to-b from-emerald-500/8 via-transparent to-transparent pointer-events-none" />
        )}

        {/* Word text — centered, pushed up slightly from bottom label */}
        <span
          className={`
            relative z-10 font-cairo font-bold tracking-wide
            text-base sm:text-lg md:text-xl
            transition-all duration-200 px-2 text-center
            leading-snug mb-5
            ${!disabled && !hasSelection ? "group-hover:scale-105" : ""}
            ${isMySelection ? "text-emerald-100" : disabled ? "text-slate-600" : "text-slate-100"}
          `}
          style={!disabled && !isMySelection ? { textShadow: "0 1px 8px rgba(0,0,0,0.9)" } : {}}
        >
          {card.text}
        </span>

        {/* Bottom label bar */}
        <BottomLabel
          label={
            hasSelection
              ? currentTurn === "blue"
                ? "BLUE"
                : currentTurn === "red"
                  ? "RED"
                  : "• • •"
              : "• • •"
          }
          dotColor={
            hasSelection && currentTurn === "blue"
              ? "bg-cyan-500/50"
              : hasSelection && currentTurn === "red"
                ? "bg-red-500/50"
                : "bg-slate-600/30"
          }
          textColor={
            hasSelection && currentTurn === "blue"
              ? "text-cyan-500/50"
              : hasSelection && currentTurn === "red"
                ? "text-red-500/50"
                : "text-slate-600/30"
          }
        />
      </button>
    </div>
  );
}

export default Card;
