import type { PhotoCredit as Credit } from '@widoo/shared';
import { colors, spacing } from '@widoo/tokens';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Icon } from './Icon';
import { Text } from './Text';

/** `mappings.photoCredit.ink`: white at 72 %, the one text of the app with an opacity (D-052). */
const DISCREET_INK = 0.72;
/** The pill is 26 points high: its touch zone reaches 44 points (`touch-min`). */
const HIT_SLOP = 9;
const MARGIN = spacing['space-16'];
/** Room the bubble needs above its pill: three lines and their padding, with some text scale. */
const BUBBLE_ROOM = 200;

interface Anchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * « © J. Moreau » on a free photo of Wikimedia Commons (Direction-Artistique › Pastilles sur
 * photo, D-052): discreet, ink at 40 % (`scrim`); a tap opens the bubble with its author, its
 * licence and « Voir sur Wikimedia Commons », a touch elsewhere closes it. A creator's photo has
 * no credit: the caller does not render this then. A dense component, read as the whole credit.
 */
export function PhotoCredit({ credit }: { credit: Credit }) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const pill = useRef<View>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const close = () => {
    setIsOpen(false);
    setAnchor(null);
  };
  const open = () => {
    setIsOpen(true);
    pill.current?.measureInWindow((x, y, pillWidth, pillHeight) =>
      setAnchor({ x, y, width: pillWidth, height: pillHeight }),
    );
  };
  // Above the pill (`mappings.photoCredit.bubble`), or under it when the top of the screen leaves
  // no room (the big photo of E-07); unseen until the pill is measured.
  const right = anchor ? Math.max(width - anchor.x - anchor.width, MARGIN) : MARGIN;
  const bubblePlace = anchor
    ? {
        right,
        ...(anchor.y > BUBBLE_ROOM
          ? { bottom: height - anchor.y + spacing['space-8'] }
          : { top: anchor.y + anchor.height + spacing['space-8'] }),
      }
    : styles.unplaced;

  return (
    <>
      <Pressable
        ref={pill}
        accessibilityRole="button"
        accessibilityLabel={t('photoCredit.label', {
          author: credit.author,
          license: credit.license,
        })}
        accessibilityHint={t('photoCredit.hint')}
        accessibilityState={{ expanded: isOpen }}
        hitSlop={HIT_SLOP}
        onPress={open}
        className="min-h-badge-h justify-center self-start rounded-pill px-8"
        style={{ backgroundColor: colors[isOpen ? 'surface-strong' : 'scrim'] }}
      >
        <Text
          variant="caption"
          color="on-strong"
          isDense
          numberOfLines={1}
          style={isOpen ? undefined : styles.discreet}
        >
          {t('photoCredit.short', { author: credit.author })}
        </Text>
      </Pressable>
      <Modal transparent visible={isOpen} animationType="fade" onRequestClose={close}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('photoCredit.close')}
          onPress={close}
          style={StyleSheet.absoluteFill}
        />
        {isOpen && (
          <View
            onAccessibilityEscape={close}
            className="absolute gap-4 rounded-block bg-surface-strong px-12 pt-12"
            // Aligned on the right of the pill, never past the left margin of the screen.
            style={[bubblePlace, { maxWidth: width - right - MARGIN }]}
          >
            <Text variant="label-strong" color="on-strong">
              {t('photoCredit.by', { author: credit.author })}
            </Text>
            <Text variant="label" color="on-strong-muted">
              {credit.license}
            </Text>
            <Pressable
              accessibilityRole="link"
              onPress={() => {
                close();
                void Linking.openURL(credit.sourceUrl);
              }}
              className="min-h-touch-min flex-row items-center gap-6"
            >
              <Text variant="label-strong" color="info-on-strong" className="shrink">
                {t('photoCredit.source')}
              </Text>
              <Icon name="arrow-square-out" size="icon-s" color="info-on-strong" />
            </Pressable>
          </View>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  discreet: { opacity: DISCREET_INK },
  unplaced: { opacity: 0 },
});
