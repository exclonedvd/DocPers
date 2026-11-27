KAIROS 11.4.0 · CLEAN & OPTIMIZATION

PUBBLICAZIONE (Cloudflare Pages / GitHub Pages)
1. Prima sincronizza i dati sul cloud e fai una copia di sicurezza del repository (commit o tag). Non cancellare dati del browser.
2. Estrai lo ZIP Aggiornamento nella radice del repository DocPers. Conserva il config.js effettivo, i file non presenti nel pacchetto e le eventuali personalizzazioni.
3. Nello stesso commit rimuovi solo i file indicati in ELENCO_FILE_DA_RIMUOVERE_11.4.0.txt (se presenti); lo ZIP, da solo, non cancella file dal repository. Se ci sono altre release storiche non elencate, non cancellarle alla cieca.
4. Pubblica con un unico commit e attendi il deploy Cloudflare. Verifica aggiornamento, accesso, calendario e sincronizzazione. Mantieni il commit precedente per rollback.
5. Per installazione pulita usa lo ZIP Completo. Nessuna migrazione SQL. I file SQL esistenti sono conservati ma non vanno rieseguiti.

NOTE
La cache di avvio contiene 10 risorse correnti e 3 file storici di compatibilità per gli updater con riferimenti fissi (5.11.0, 11.2.0 e 11.2.1). Restano sul server i file versionati 11.3.13 e 11.3.14, ma i loro manifest sono storici: per un rollback completo ripristinare il commit precedente, non soltanto index.html. Il worker conserva le cache delle due release precedenti, se presenti. Per utenti con client molto vecchi già aperti, può essere necessario chiudere tutte le finestre e riaprire online: non cancellare i dati del sito. Non sono state modificate le chiavi di persistenza né i dati.

Eliminati file obsoleti e duplicati delle release storiche
Cache di avvio ridotta alle risorse correnti e tre piccoli file di compatibilità
Conservate le due release precedenti e le rispettive cache
Download cache in gruppi di quattro; riparazione con timeout e retry
Motore spettanze, calendario, profili e database invariati
