#!/usr/bin/env python3
"""
Vatsin Granite ERP - Server Management Script
Manages development servers, database, and application lifecycle
"""

import argparse
import os
import signal
import subprocess
import sys
import time
import shutil
from pathlib import Path
import json

class Colors:
    """Terminal color codes"""
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    PURPLE = '\033[95m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    END = '\033[0m'

class ServerManager:
    """Manages Vatsin Granite ERP servers"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent if Path(__file__).parent.name == 'scripts' else Path(__file__).parent
        self.api_port = 8080
        self.web_port = 5173
        self.env_file = self.project_root / '.env'
        # Database is in packages/api/data/
        self.db_path = self.project_root / 'packages' / 'api' / 'data' / 'vatsingranite.db'
        
    def print_header(self, text):
        """Print formatted header"""
        print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*60}{Colors.END}")
        print(f"{Colors.BOLD}{Colors.CYAN}{text:^60}{Colors.END}")
        print(f"{Colors.BOLD}{Colors.CYAN}{'='*60}{Colors.END}\n")
    
    def print_success(self, text):
        """Print success message"""
        print(f"{Colors.GREEN}✅ {text}{Colors.END}")
    
    def print_error(self, text):
        """Print error message"""
        print(f"{Colors.RED}❌ {text}{Colors.END}")
    
    def print_warning(self, text):
        """Print warning message"""
        print(f"{Colors.YELLOW}⚠️  {text}{Colors.END}")
    
    def print_info(self, text):
        """Print info message"""
        print(f"{Colors.BLUE}ℹ️  {text}{Colors.END}")
    
    def get_process_on_port(self, port):
        """Get PID of process running on specified port"""
        try:
            result = subprocess.run(
                ['lsof', '-ti', f':{port}'],
                capture_output=True,
                text=True
            )
            pids = result.stdout.strip().split('\n')
            return [int(pid) for pid in pids if pid]
        except Exception:
            return []
    
    def kill_process(self, pid):
        """Kill process by PID"""
        try:
            os.kill(pid, signal.SIGTERM)
            time.sleep(0.5)
            # Force kill if still running
            try:
                os.kill(pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            return True
        except ProcessLookupError:
            return False
        except Exception as e:
            self.print_error(f"Failed to kill process {pid}: {e}")
            return False
    
    def is_port_open(self, port):
        """Check if port is in use"""
        return len(self.get_process_on_port(port)) > 0
    
    def check_prerequisites(self):
        """Check if prerequisites are met"""
        issues = []
        
        # Check Node.js
        try:
            result = subprocess.run(['node', '--version'], capture_output=True, text=True)
            version = result.stdout.strip()
            print(f"   Node.js: {Colors.GREEN}{version}{Colors.END}")
        except FileNotFoundError:
            issues.append("Node.js not found")
        
        # Check npm
        try:
            result = subprocess.run(['npm', '--version'], capture_output=True, text=True)
            version = result.stdout.strip()
            print(f"   npm: {Colors.GREEN}{version}{Colors.END}")
        except FileNotFoundError:
            issues.append("npm not found")
        
        # Check .env
        if self.env_file.exists():
            print(f"   .env: {Colors.GREEN}exists{Colors.END}")
        else:
            self.print_warning(".env file not found")
        
        # Check node_modules
        if (self.project_root / 'node_modules').exists():
            print(f"   Dependencies: {Colors.GREEN}installed{Colors.END}")
        else:
            issues.append("Dependencies not installed (run: npm install)")
        
        # Check database
        if self.db_path.exists():
            size = self.db_path.stat().st_size / (1024 * 1024)
            print(f"   Database: {Colors.GREEN}exists ({size:.2f} MB){Colors.END}")
        else:
            self.print_warning("Database not found")
        
        return issues
    
    def setup_environment(self):
        """Set up environment (copy .env, install deps, migrate)"""
        self.print_header("Setting Up Environment")
        
        # Copy .env if needed
        if not self.env_file.exists():
            env_example = self.project_root / '.env.example'
            if env_example.exists():
                shutil.copy(env_example, self.env_file)
                self.print_success(".env file created from .env.example")
            else:
                self.print_error(".env.example not found")
                return False
        
        # Check node_modules
        if not (self.project_root / 'node_modules').exists():
            self.print_info("Installing dependencies...")
            result = subprocess.run(['npm', 'install'], cwd=self.project_root)
            if result.returncode != 0:
                self.print_error("Failed to install dependencies")
                return False
            self.print_success("Dependencies installed")
        
        # Check database
        if not self.db_path.exists():
            self.print_info("Database not found. Running migrations...")
            result = subprocess.run(['npm', 'run', 'migrate'], cwd=self.project_root)
            if result.returncode != 0:
                self.print_error("Failed to run migrations")
                return False
            
            self.print_info("Seeding database...")
            result = subprocess.run(['npm', 'run', 'seed'], cwd=self.project_root)
            if result.returncode != 0:
                self.print_error("Failed to seed database")
                return False
            
            self.print_success("Database initialized")
        
        return True
    
    def start(self, api_only=False, web_only=False):
        """Start development servers"""
        self.print_header("Starting Vatsin Granite ERP")
        
        # Check prerequisites
        issues = self.check_prerequisites()
        if issues:
            self.print_error("Prerequisites not met:")
            for issue in issues:
                print(f"   • {issue}")
            
            setup = input(f"\n{Colors.YELLOW}Run setup? (y/n): {Colors.END}").lower()
            if setup == 'y':
                if not self.setup_environment():
                    return False
            else:
                return False
        
        # Check if already running
        if self.is_port_open(self.api_port) and not web_only:
            self.print_warning(f"API server already running on port {self.api_port}")
        if self.is_port_open(self.web_port) and not api_only:
            self.print_warning(f"Web server already running on port {self.web_port}")
        
        print()
        self.print_info("Starting development servers...")
        print(f"   API:  {Colors.CYAN}http://localhost:{self.api_port}{Colors.END}")
        print(f"   Web:  {Colors.CYAN}http://localhost:{self.web_port}{Colors.END}")
        print(f"\n{Colors.YELLOW}Press Ctrl+C to stop{Colors.END}\n")
        
        try:
            if api_only:
                subprocess.run(['npm', 'run', 'dev:api'], cwd=self.project_root)
            elif web_only:
                subprocess.run(['npm', 'run', 'dev:web'], cwd=self.project_root)
            else:
                subprocess.run(['npm', 'run', 'dev'], cwd=self.project_root)
        except KeyboardInterrupt:
            print(f"\n\n{Colors.YELLOW}Shutting down...{Colors.END}")
            self.stop()
        
        return True
    
    def stop(self):
        """Stop all servers"""
        self.print_header("Stopping Vatsin Granite ERP")
        
        stopped = False
        
        # Stop API server
        api_pids = self.get_process_on_port(self.api_port)
        if api_pids:
            print(f"   Stopping API server (port {self.api_port})...")
            for pid in api_pids:
                self.kill_process(pid)
            self.print_success("API server stopped")
            stopped = True
        else:
            self.print_info("API server not running")
        
        # Stop Web server
        web_pids = self.get_process_on_port(self.web_port)
        if web_pids:
            print(f"   Stopping Web server (port {self.web_port})...")
            for pid in web_pids:
                self.kill_process(pid)
            self.print_success("Web server stopped")
            stopped = True
        else:
            self.print_info("Web server not running")
        
        # Clean up any remaining node processes
        try:
            result = subprocess.run(
                ['pkill', '-f', 'vatsingranite|concurrently|vite'],
                capture_output=True
            )
            if result.returncode == 0:
                print("   Cleaned up remaining processes")
        except Exception:
            pass
        
        if stopped:
            print()
            self.print_success("All servers stopped")
        
        return True
    
    def restart(self):
        """Restart all servers"""
        self.print_header("Restarting Vatsin Granite ERP")
        
        self.stop()
        print(f"\n{Colors.YELLOW}⏳ Waiting for ports to be released...{Colors.END}")
        time.sleep(2)
        
        return self.start()
    
    def status(self):
        """Check status of all services"""
        self.print_header("Vatsin Granite ERP - Service Status")
        
        # API Server
        print(f"{Colors.BLUE}🔵 API Server (port {self.api_port}):{Colors.END}")
        api_pids = self.get_process_on_port(self.api_port)
        if api_pids:
            print(f"   Status: {Colors.GREEN}🟢 RUNNING{Colors.END}")
            print(f"   PIDs: {', '.join(map(str, api_pids))}")
            print(f"   URL: {Colors.CYAN}http://localhost:{self.api_port}{Colors.END}")
            
            # Test health endpoint
            try:
                import urllib.request
                with urllib.request.urlopen(f'http://localhost:{self.api_port}/health', timeout=2) as response:
                    if response.status == 200:
                        data = json.loads(response.read())
                        print(f"   Health: {Colors.GREEN}✅ HEALTHY{Colors.END}")
                        print(f"   Version: {data.get('version', 'N/A')}")
            except Exception:
                print(f"   Health: {Colors.YELLOW}⚠️  NOT RESPONDING{Colors.END}")
        else:
            print(f"   Status: {Colors.RED}🔴 STOPPED{Colors.END}")
        
        print()
        
        # Web Server
        print(f"{Colors.PURPLE}🟣 Web Server (port {self.web_port}):{Colors.END}")
        web_pids = self.get_process_on_port(self.web_port)
        if web_pids:
            print(f"   Status: {Colors.GREEN}🟢 RUNNING{Colors.END}")
            print(f"   PIDs: {', '.join(map(str, web_pids))}")
            print(f"   URL: {Colors.CYAN}http://localhost:{self.web_port}{Colors.END}")
        else:
            print(f"   Status: {Colors.RED}🔴 STOPPED{Colors.END}")
        
        print()
        
        # Database
        print(f"{Colors.CYAN}💾 Database:{Colors.END}")
        if self.db_path.exists():
            size = self.db_path.stat().st_size / (1024 * 1024)
            print(f"   Status: {Colors.GREEN}✅ EXISTS{Colors.END}")
            print(f"   Location: {self.db_path}")
            print(f"   Size: {size:.2f} MB")
            
            # Count tables
            try:
                result = subprocess.run(
                    ['sqlite3', str(self.db_path), 
                     "SELECT COUNT(*) FROM sqlite_master WHERE type='table';"],
                    capture_output=True,
                    text=True
                )
                tables = result.stdout.strip()
                print(f"   Tables: {tables}")
            except Exception:
                pass
        else:
            print(f"   Status: {Colors.RED}❌ NOT FOUND{Colors.END}")
            print(f"   Run: {Colors.YELLOW}python manage.py migrate{Colors.END}")
        
        print(f"\n{Colors.CYAN}{'='*60}{Colors.END}\n")
        
        return True
    
    def migrate(self):
        """Run database migrations"""
        self.print_header("Running Database Migrations")
        
        result = subprocess.run(['npm', 'run', 'migrate'], cwd=self.project_root)
        if result.returncode == 0:
            self.print_success("Migrations completed")
            return True
        else:
            self.print_error("Migrations failed")
            return False
    
    def seed(self):
        """Seed database with initial data"""
        self.print_header("Seeding Database")
        
        result = subprocess.run(['npm', 'run', 'seed'], cwd=self.project_root)
        if result.returncode == 0:
            self.print_success("Database seeded successfully")
            return True
        else:
            self.print_error("Seeding failed")
            return False
    
    def backup(self):
        """Backup database"""
        self.print_header("Backing Up Database")
        
        if not self.db_path.exists():
            self.print_error("Database not found")
            return False
        
        backup_dir = self.project_root / 'backups'
        backup_dir.mkdir(exist_ok=True)
        
        timestamp = time.strftime('%Y%m%d_%H%M%S')
        backup_file = backup_dir / f'vatsingranite_{timestamp}.db'
        
        try:
            shutil.copy(self.db_path, backup_file)
            
            # Also backup WAL and SHM if they exist
            wal_file = Path(str(self.db_path) + '-wal')
            shm_file = Path(str(self.db_path) + '-shm')
            
            if wal_file.exists():
                shutil.copy(wal_file, str(backup_file) + '-wal')
            if shm_file.exists():
                shutil.copy(shm_file, str(backup_file) + '-shm')
            
            size = backup_file.stat().st_size / (1024 * 1024)
            self.print_success(f"Backup created: {backup_file}")
            print(f"   Size: {size:.2f} MB")
            
            # Clean old backups (keep last 30)
            backups = sorted(backup_dir.glob('vatsingranite_*.db'))
            if len(backups) > 30:
                for old_backup in backups[:-30]:
                    old_backup.unlink()
                    Path(str(old_backup) + '-wal').unlink(missing_ok=True)
                    Path(str(old_backup) + '-shm').unlink(missing_ok=True)
                print(f"   Cleaned {len(backups) - 30} old backups")
            
            return True
        except Exception as e:
            self.print_error(f"Backup failed: {e}")
            return False
    
    def reset(self):
        """Reset database (remove and recreate)"""
        self.print_header("Resetting Database")
        
        confirm = input(f"{Colors.RED}⚠️  This will delete all data! Continue? (yes/no): {Colors.END}").lower()
        if confirm != 'yes':
            self.print_info("Reset cancelled")
            return False
        
        # Remove database files
        if self.db_path.exists():
            self.db_path.unlink()
            self.print_success("Database removed")
        
        Path(str(self.db_path) + '-wal').unlink(missing_ok=True)
        Path(str(self.db_path) + '-shm').unlink(missing_ok=True)
        
        # Run migrations and seed
        if self.migrate() and self.seed():
            self.print_success("Database reset complete")
            return True
        else:
            self.print_error("Database reset failed")
            return False
    
    def logs(self, follow=False):
        """View application logs"""
        self.print_header("Application Logs")
        
        log_file = self.project_root / 'logs' / 'app.log'
        if not log_file.exists():
            self.print_warning("No log file found")
            return False
        
        if follow:
            subprocess.run(['tail', '-f', str(log_file)])
        else:
            subprocess.run(['tail', '-n', '50', str(log_file)])
        
        return True


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Vatsin Granite ERP Server Management',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python manage.py start           # Start all servers
  python manage.py start --api     # Start API only
  python manage.py start --web     # Start Web only
  python manage.py stop            # Stop all servers
  python manage.py restart         # Restart all servers
  python manage.py status          # Check status
  python manage.py migrate         # Run migrations
  python manage.py seed            # Seed database
  python manage.py backup          # Backup database
  python manage.py reset           # Reset database
  python manage.py logs            # View logs
  python manage.py logs --follow   # Follow logs
        """
    )
    
    parser.add_argument(
        'command',
        choices=['start', 'stop', 'restart', 'status', 'migrate', 'seed', 
                 'backup', 'reset', 'logs', 'setup'],
        help='Command to execute'
    )
    
    parser.add_argument(
        '--api',
        action='store_true',
        help='API server only (for start command)'
    )
    
    parser.add_argument(
        '--web',
        action='store_true',
        help='Web server only (for start command)'
    )
    
    parser.add_argument(
        '--follow', '-f',
        action='store_true',
        help='Follow logs (for logs command)'
    )
    
    args = parser.parse_args()
    
    manager = ServerManager()
    
    try:
        if args.command == 'start':
            success = manager.start(api_only=args.api, web_only=args.web)
        elif args.command == 'stop':
            success = manager.stop()
        elif args.command == 'restart':
            success = manager.restart()
        elif args.command == 'status':
            success = manager.status()
        elif args.command == 'migrate':
            success = manager.migrate()
        elif args.command == 'seed':
            success = manager.seed()
        elif args.command == 'backup':
            success = manager.backup()
        elif args.command == 'reset':
            success = manager.reset()
        elif args.command == 'logs':
            success = manager.logs(follow=args.follow)
        elif args.command == 'setup':
            success = manager.setup_environment()
        else:
            parser.print_help()
            success = False
        
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Operation cancelled{Colors.END}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Colors.RED}Error: {e}{Colors.END}")
        sys.exit(1)


if __name__ == '__main__':
    main()
