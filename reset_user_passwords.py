from app.database import SessionLocal
from app.models.user import User
from app.models.vm import VM  # Import VM to resolve SQLAlchemy mapping relationships
from app.routers.auth import hash_password

def reset_users():
    db = SessionLocal()
    try:
        # Assurer l'existence du compte 'admin'
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            admin = User(
                username="admin",
                email="admin@upf.ac.ma",
                hashed_password=hash_password("Admin@2024"),
                is_verified=True,
                is_admin=True
            )
            db.add(admin)
            db.commit()
            print("Compte 'admin' créé avec succès (Mot de passe: Admin@2024)")
        else:
            admin.hashed_password = hash_password("Admin@2024")
            admin.is_verified = True
            admin.is_admin = True
            db.commit()
            print("Compte 'admin' existant mis à jour (Mot de passe: Admin@2024)")

        users = db.query(User).all()
        print("Comptes trouvés dans la base de données :")
        for u in users:
            # Réinitialiser le mot de passe à Admin@2024
            u.hashed_password = hash_password("Admin@2024")
            u.is_verified = True
            u.is_admin = True
            print(f" - Utilisateur : '{u.username}' | Email : '{u.email}' -> Mot de passe réinitialisé à 'Admin@2024' (Statut: Activé & Admin)")
        db.commit()
    except Exception as e:
        print(f"Erreur : {e}")
    finally:
        db.close()

if __name__ == "__main__":
    reset_users()
