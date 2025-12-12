//import { SignedIn, SignedOut, UserButton } from "@daveyplate/better-auth-ui"
import { Link } from '@tanstack/react-router';
import { TextGif } from '~/components/ui/text-gif';
import { ModeToggle } from './mode-toggle';
import { VIEWER_ROUTE_PATH } from '~/features/viewer/route-id';


export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/60 px-4 py-3 backdrop-blur">
      <div className="container mx-auto flex h-14 items-center">
        <div className="mr-4 flex">
          <Link to="/" className="font-bold text-2xl text-foreground">
            <TextGif
              text={'C' + 'SV'}
              gif="https://media.giphy.com/media/4bhs1boql4XVJgmm4H/giphy.gif"
              className="text-xxxl font-bold"
            />
          </Link>
        </div>

        <nav className="ml-auto flex items-center space-x-6">
          <Link
            to="/todo"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <TextGif
              text={'To' + 'do'}
              gif="https://media.giphy.com/media/4bhs1boql4XVJgmm4H/giphy.gif"
              className="!text-xl font-bold"
            />
          </Link>
          <Link
            to={VIEWER_ROUTE_PATH}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <TextGif
              text={'View' + 'er'}
              gif="https://media.giphy.com/media/4bhs1boql4XVJgmm4H/giphy.gif"
              className="!text-xl font-bold"
            />
          </Link>
          <Link
            to="/logs"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <TextGif
              text={'Log' + 'ger'}
              gif="https://media.giphy.com/media/4bhs1boql4XVJgmm4H/giphy.gif"
              className="!text-xl font-bold"
            />
          </Link>
          <Link
            to="/docs"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <TextGif
              text={'Do' + 'cs'}
              gif="https://media.giphy.com/media/4bhs1boql4XVJgmm4H/giphy.gif"
              className="!text-xl font-bold"
            />
          </Link>
          <a
            href="https://github.com/AcidicSoil/codex-session-view"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <TextGif
              text={'Git' + 'Hub'}
              gif="https://media.giphy.com/media/4bhs1boql4XVJgmm4H/giphy.gif"
              className="!text-xl font-xl"
            />
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
          <ModeToggle />
          {/* <UserButton />

                    <SignedOut>
                        <Link to="/auth/$pathname" params={{ pathname: "sign-in" }}>
                            <Button className="rounded-full bg-primary px-6 font-medium text-primary-foreground text-sm hover:bg-primary/90">
                                Sign In <span className="ml-1">↗</span>
                            </Button>
                        </Link>
                    </SignedOut>
                    <SignedIn>
                        <Link to="/dashboard">
                            <Button className="rounded-full bg-primary px-6 font-medium text-primary-foreground text-sm hover:bg-primary/90">
                                Dashboard <span className="ml-1">↗</span>
                            </Button>
                        </Link>
                    </SignedIn> */}
        </nav>
      </div>
    </header>
  );
}
