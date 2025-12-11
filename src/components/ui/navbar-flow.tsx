'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAnimation } from 'framer-motion';
import { cn } from '~/lib/utils';
import type { NavbarFlowProps } from './navbar-flow.types';
import { createDefaultRenderer } from './navbar-flow.primitives';
import { NavbarFlowDesktop } from './navbar-flow.desktop';
import { NavbarFlowMobile } from './navbar-flow.mobile';

export default function NavbarFlow({
  emblem,
  links = [],
  extraIcons = [],
  styleName = '',
  rightComponent,
  className,
  dataTestId,
  isHidden = false,
  renderLink,
  isSticky = true,
  stickyOffset = 0,
  stickyZIndex = 1000,
  desktopShellClassName,
  mobileShellClassName,
}: NavbarFlowProps) {
  const [sequenceDone, setSequenceDone] = useState(false);
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [mobileView, setMobileView] = useState(false);
  const [selectedSubmenu, setSelectedSubmenu] = useState<string | null>(null);
  const [openedSections, setOpenedSections] = useState<Record<string, boolean>>({});
  const [isMounted, setIsMounted] = useState(false);

  const navMotion = useAnimation();
  const emblemMotion = useAnimation();
  const switchMotion = useAnimation();
  const svgMotion = useAnimation();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const detectMobile = () => {
      setMobileView(window.innerWidth < 768);
    };

    detectMobile();
    window.addEventListener('resize', detectMobile);
    return () => window.removeEventListener('resize', detectMobile);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const runSequence = async () => {
      if (mobileView) {
        await Promise.all([
          emblemMotion.start({
            opacity: 1,
            x: 0,
            transition: { duration: 0.6, ease: 'easeOut' },
          }),
          navMotion.start({
            opacity: 1,
            transition: { duration: 0.6, ease: 'easeOut' },
          }),
          switchMotion.start({
            opacity: 1,
            x: 0,
            transition: { duration: 0.6, ease: 'easeOut' },
          }),
        ]);
      } else {
        await navMotion.start({
          width: 'auto',
          padding: '10px 30px',
          transition: { duration: 0.8, ease: 'easeOut' },
        });

        await svgMotion.start({
          opacity: 1,
          transition: { duration: 0.5 },
        });

        await Promise.all([
          emblemMotion.start({
            opacity: 1,
            x: 0,
            transition: { duration: 0.6, ease: 'easeOut' },
          }),
          switchMotion.start({
            opacity: 1,
            x: 0,
            transition: { duration: 0.6, ease: 'easeOut' },
          }),
        ]);
      }

      setSequenceDone(true);
    };

    runSequence();
  }, [navMotion, emblemMotion, switchMotion, svgMotion, mobileView, isMounted]);

  const toggleMobileMenu = () => {
    setMobileMenuVisible((prev) => !prev);
  };

  const toggleSection = (text: string) => {
    setOpenedSections((prev) => ({ ...prev, [text]: !prev[text] }));
  };

  const hideMobileMenu = () => {
    setMobileMenuVisible(false);
  };

  const linkRenderer = useMemo(() => createDefaultRenderer(renderLink), [renderLink]);

  const rootStyles = isSticky
    ? {
        top: stickyOffset,
        zIndex: stickyZIndex,
      }
    : undefined;

  return (
    <div
      className={cn(
        isSticky ? 'sticky w-full' : 'w-full',
        '[--nav-height:theme(space.24)]',
        styleName,
        className
      )}
      style={rootStyles}
      data-testid={dataTestId}
      data-visibility={isHidden ? 'hidden' : 'visible'}
    >
      <div className="hidden md:block">
        <NavbarFlowDesktop
          emblem={emblem}
          links={links}
          extraIcons={extraIcons}
          rightComponent={rightComponent}
          className={desktopShellClassName}
          isHidden={isHidden}
          navMotion={navMotion}
          emblemMotion={emblemMotion}
          switchMotion={switchMotion}
          svgMotion={svgMotion}
          selectedSubmenu={selectedSubmenu}
          setSelectedSubmenu={setSelectedSubmenu}
          linkRenderer={linkRenderer}
          hideMobileMenu={hideMobileMenu}
          sequenceDone={sequenceDone}
        />
      </div>

      <NavbarFlowMobile
        emblem={emblem}
        links={links}
        extraIcons={extraIcons}
        rightComponent={rightComponent}
        isHidden={isHidden}
        emblemMotion={{ opacity: 1, x: 0 }}
        switchMotion={{ opacity: 1, x: 0 }}
        mobileMenuVisible={mobileMenuVisible}
        toggleMobileMenu={toggleMobileMenu}
        openedSections={openedSections}
        toggleSection={toggleSection}
        hideMobileMenu={hideMobileMenu}
        mobileShellClassName={mobileShellClassName}
        linkRenderer={linkRenderer}
      />
    </div>
  );
}
