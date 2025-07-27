import { withI18n } from '~/lib/i18n/with-i18n';

function SiteLayout(props: React.PropsWithChildren) {
  return (
    <div className={'flex min-h-[100vh] flex-col'}>
      {props.children}
    </div>
  );
}

export default withI18n(SiteLayout);
