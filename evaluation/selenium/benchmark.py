from selenium import webdriver
import time
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# Pfad zur Firefox-Erweiterung (.xpi-Datei)
erweiterung_pfad = '/Users/luca/Library/CloudStorage/OneDrive-Persönlich/Dokumente/Uni/BA/Builds/17840039dd4943e1851d-1.1.2.xpi'
# firefox_profile_path = '../../firefox-profile'
firefox_profile_path = './firefox-profile'
# URL der zu testenden Webseite
url = 'https://transparent-vm.net:8080'
# waiting condition to detect the main site
waiting_condition = EC.presence_of_element_located((By.ID, 'test123'))

testcases = ["raw", "unknown", "known"]

# options = Options()
options = webdriver.FirefoxOptions()

# Definiere Optionen, um den Cache zu deaktivieren
# Nicht mehr nötig, da Browser für jeden Test neu gestartet wird
options.set_preference("browser.cache.disk.enable", False)
options.set_preference("browser.cache.memory.enable", False)
options.set_preference("browser.cache.offline.enable", False)
options.set_preference("network.http.use-cache", False)

# options.set_preference("profile", firefox_profile_path)
options.profile = firefox_profile_path
# options.add_argument("-profile firefox_profile_path")

# Anzahl der Wiederholungen
anzahl_wiederholungen = 20

# Liste zur Speicherung der Ladezeiten
ladezeiten = {}

# Starte den Testschleife
for testcase in testcases:
    ladezeiten[testcase] = []
    print(f'testing: {testcase}')
    for _ in range(anzahl_wiederholungen):
        driver = webdriver.Firefox(options=options)

        # Lade die Erweiterung
        if testcase != "raw":
            driver.install_addon(erweiterung_pfad)
        else:
            driver.get(url)

        # be sure the browser was already open before starting the measurement
        for _ in range(50):
            driver.get("https://example.com")

        # Navigiere zur Webseite
        startzeit = time.time()  # Startzeit messen
        driver.get(url)
        if testcase != "raw":
            WebDriverWait(driver, timeout=10, poll_frequency=1/1000).until(waiting_condition)
        endzeit = time.time()  # Endzeit messen

        if testcase == "known":
            for _ in range(50):
                driver.get("https://example.com")
            startzeit = time.time()
            driver.get(url)
            endzeit = time.time()

        ladezeit = (endzeit - startzeit) * 1000  # Ladezeit berechnen
        ladezeiten[testcase].append(ladezeit)

        # Lösche Cookies und Local Storage
        driver.quit()

        # Nicht mehr nötig, da Browser neu gestartet wird
        # driver.delete_all_cookies()
        # driver.execute_script('window.localStorage.clear();')

for testcase in testcases:
    # Berechne Durchschnittliche Ladezeit
    durchschnittliche_ladezeit = sum(ladezeiten[testcase]) / len(ladezeiten[testcase])

    # Gib die Ergebnisse aus
    print(f'Testcase: {testcase}')
    print(f'Durchschnittliche Ladezeit nach {anzahl_wiederholungen} Versuchen: {durchschnittliche_ladezeit} ms')
    print(f'Lowest: {min(ladezeiten[testcase])}, highest: {max(ladezeiten[testcase])}')
    print(str(ladezeiten[testcase]))
    print()
