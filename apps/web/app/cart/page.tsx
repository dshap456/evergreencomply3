import { withI18n } from '~/lib/i18n/with-i18n';
import { CartClient } from './_components/cart-client';
import { loadAvailableCourses } from './_lib/server/load-available-courses';

async function CartPage() {
  const coursesWithMapping = await loadAvailableCourses();

  return <CartClient availableCourses={coursesWithMapping} />;
}

export default withI18n(CartPage);
