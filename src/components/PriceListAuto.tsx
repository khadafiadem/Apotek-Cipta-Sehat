import React, { useEffect, useRef } from 'react';
import { usePharmacy } from '../PharmacyContext';
import { runAutoPriceListExport } from '../lib/priceListSchedule';

export default function PriceListAuto() {
  const { medicines } = usePharmacy();
  const medicinesRef = useRef(medicines);

  useEffect(() => {
    medicinesRef.current = medicines;
  }, [medicines]);

  useEffect(() => {
    const run = () => runAutoPriceListExport(medicinesRef.current);
    run();
    const id = window.setInterval(run, 30 * 1000);
    return () => window.clearInterval(id);
  }, []);

  return null;
}
