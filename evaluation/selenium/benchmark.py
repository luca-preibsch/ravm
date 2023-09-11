from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service
import time
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# Pfad zur Firefox-Erweiterung (.xpi-Datei)
erweiterung_pfad = '/Users/luca/Library/CloudStorage/OneDrive-Persönlich/Dokumente/Uni/BA/Builds/17840039dd4943e1851d-1.1.2.xpi'
# firefox_profile_path = '../../firefox-profile'
firefox_profile_path = './firefox-profile'

# Definiere Optionen, um den Cache zu deaktivieren
# options = Options()
options = webdriver.FirefoxOptions()
options.set_preference("browser.cache.disk.enable", False)
options.set_preference("browser.cache.memory.enable", False)
options.set_preference("browser.cache.offline.enable", False)
options.set_preference("network.http.use-cache", False)
# options.set_preference("profile", firefox_profile_path)
options.profile = firefox_profile_path

# Erstelle den WebDriver mit den angegebenen Optionen und Profil
driver = webdriver.Firefox(options=options)

# URL der zu testenden Webseite
url = 'https://transparent-vm.net:8080'

# Anzahl der Wiederholungen
anzahl_wiederholungen = 10

# Liste zur Speicherung der Ladezeiten
ladezeiten = []

# Starte den Testschleife
for _ in range(anzahl_wiederholungen):
    driver = webdriver.Firefox(options=options)

    # Lade die Erweiterung
    driver.install_addon(erweiterung_pfad)

    time.sleep(2)

    # Navigiere zur Webseite
    startzeit = time.time()  # Startzeit messen
    driver.get(url)
    print(driver.current_url)

    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.ID, 'test123'))
    )

    print(driver.current_url)

    endzeit = time.time()  # Endzeit messen
    ladezeit = (endzeit - startzeit) * 1000  # Ladezeit berechnen
    ladezeiten.append(ladezeit)

    # Lösche Cookies und Local Storage
    driver.quit()
    # driver.delete_all_cookies()
    # driver.execute_script('window.localStorage.clear();')

# Berechne Durchschnittliche Ladezeit
durchschnittliche_ladezeit = sum(ladezeiten) / len(ladezeiten)

# Schließe den Browser
# driver.quit()

# Gib die Ergebnisse aus
print(f'Durchschnittliche Ladezeit nach {anzahl_wiederholungen} Versuchen: {durchschnittliche_ladezeit} ms')
